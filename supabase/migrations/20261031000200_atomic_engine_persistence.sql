-- Atomic storage of an already-computed engine snapshot. No gameplay is evaluated here.
create function public.persist_engine_snapshot(
  p_room_id uuid, p_expected_version bigint, p_command_id text, p_snapshot jsonb
) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
  current_version bigint;
  incoming public.game_states;
  projection record;
  identity_join text;
  conflict_columns text;
  update_columns text;
  invalid boolean;
  existing_commands integer;
begin
  -- The room lock also serializes initial inserts and consistent snapshot reads.
  perform 1 from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = '23503'; end if;
  select * into incoming from jsonb_populate_record(null::public.game_states,p_snapshot->'game_state');
  if incoming.room_id is distinct from p_room_id then raise exception 'ROOM_MISMATCH' using errcode = '23514'; end if;
  select version into current_version from public.game_states where room_id = p_room_id for update;
  if p_expected_version is null then
    if current_version is not null or incoming.version <> 0 or p_command_id is not null then
      raise exception 'VERSION_CONFLICT' using errcode = '40001';
    end if;
  elsif current_version is distinct from p_expected_version or incoming.version <> p_expected_version + 1 then
    raise exception 'VERSION_CONFLICT' using errcode = '40001';
  end if;
  if p_command_id is not null and exists(select 1 from public.processed_commands where room_id=p_room_id and command_id=p_command_id) then
    raise exception 'COMMAND_ALREADY_APPLIED' using errcode = '23505';
  end if;
  select count(*) into existing_commands from public.processed_commands where room_id=p_room_id;
  if jsonb_array_length(p_snapshot->'processed_commands') <> existing_commands + (case when p_expected_version is null then 0 else 1 end)
    or (p_expected_version is not null and (p_command_id is null or p_snapshot->'processed_commands'->-1->>'command_id' is distinct from p_command_id)) then
    raise exception 'INVALID_COMMAND_LEDGER' using errcode = '23514';
  end if;
  -- Validate persisted role references against existing room members, not callsigns.
  if (select count(*) from jsonb_each_text(incoming.role_assignments)) <> 4 or exists(
    select 1 from jsonb_each_text(incoming.role_assignments) a
    where not exists(select 1 from public.players p where p.room_id=p_room_id and p.id=a.value::uuid and p.role=a.key)
  ) then raise exception 'INVALID_ROLE_MEMBERSHIP' using errcode = '23514'; end if;

  -- Replace the scalar current-state row under the lock; deferred FKs permit new
  -- selected proposals/events to be inserted later in this same transaction.
  insert into public.game_states select incoming.*
  on conflict (room_id) do update set
    scenario_id=excluded.scenario_id,mode=excluded.mode,status=excluded.status,phase=excluded.phase,round=excluded.round,
    grid=excluded.grid,safety=excluded.safety,economy=excluded.economy,trust=excluded.trust,
    cascade_risk=excluded.cascade_risk,collaboration_score=excluded.collaboration_score,
    helix_exposed=excluded.helix_exposed,information_suppressed=excluded.information_suppressed,
    suppression_exposed=excluded.suppression_exposed,true_cause_discovered=excluded.true_cause_discovered,
    confirmed_wrongdoing_published=excluded.confirmed_wrongdoing_published,s7_isolated=excluded.s7_isolated,
    selected_proposal_id=excluded.selected_proposal_id,active_event_id=excluded.active_event_id,
    phase_ends_at=excluded.phase_ends_at,started_at=excluded.started_at,completed_at=excluded.completed_at,
    version=excluded.version,map=excluded.map,role_assignments=excluded.role_assignments,
    resolved_rounds=excluded.resolved_rounds,executed_responses=excluded.executed_responses,
    suppression_evidence_snapshot=excluded.suppression_evidence_snapshot,contributions=excluded.contributions,
    redline_resolution=excluded.redline_resolution,result=excluded.result,updated_at=excluded.updated_at;

  -- Fixed allowlist: payloads cannot choose table names, SQL, or conflict keys.
  for projection in select * from (values
    ('proposals',array['room_id','id'],false),
    ('votes',array['room_id','proposal_id','player_id'],true),
    ('evidence',array['room_id','id'],false),
    ('player_abilities',array['room_id','ability_id'],false),
    ('events',array['room_id','id'],true),
    ('timeline',array['room_id','id'],true),
    ('private_intel',array['room_id','id'],false),
    ('redline_ballots',array['room_id','player_id'],false),
    ('processed_commands',array['room_id','command_id'],true),
    ('collaboration_rewards',array['room_id','reward_key'],true)
  ) as projections(table_name,key_names,immutable) loop
    if jsonb_typeof(p_snapshot->projection.table_name) is distinct from 'array' then
      raise exception 'MISSING_PROJECTION: %',projection.table_name using errcode = '23514';
    end if;
    execute format('select exists(select 1 from jsonb_populate_recordset(null::public.%I,$1) n where n.room_id is distinct from $2)',projection.table_name)
      into invalid using p_snapshot->projection.table_name,p_room_id;
    if invalid then raise exception 'ROOM_MISMATCH' using errcode = '23514'; end if;
    select string_agg(format('o.%I = n.%I',k,k),' and '),string_agg(format('%I',k),',')
      into identity_join,conflict_columns from unnest(projection.key_names) k;
    execute format('select exists(select 1 from public.%I o where o.room_id=$2 and not exists
      (select 1 from jsonb_populate_recordset(null::public.%I,$1) n where %s))',projection.table_name,projection.table_name,identity_join)
      into invalid using p_snapshot->projection.table_name,p_room_id;
    if invalid then raise exception 'SNAPSHOT_REMOVES_HISTORY: %',projection.table_name using errcode='23514'; end if;
    if projection.immutable then
      execute format('select exists(select 1 from public.%I o join jsonb_populate_recordset(null::public.%I,$1) n on %s
        where o.room_id=$2 and (to_jsonb(o)-''created_at''-''processed_at'') is distinct from (to_jsonb(n)-''created_at''-''processed_at''))',
        projection.table_name,projection.table_name,identity_join)
        into invalid using p_snapshot->projection.table_name,p_room_id;
      if invalid then raise exception 'IMMUTABLE_RECORD: %',projection.table_name using errcode='23514'; end if;
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1) on conflict (%s) do nothing',
        projection.table_name,projection.table_name,conflict_columns) using p_snapshot->projection.table_name;
    else
      select string_agg(format('%I=excluded.%I',a.attname,a.attname),',') into update_columns
        from pg_catalog.pg_attribute a where a.attrelid=format('public.%I',projection.table_name)::regclass
        and a.attnum>0 and not a.attisdropped and not a.attname=any(projection.key_names) and a.attname<>'created_at';
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I,$1)
        on conflict (%s) do update set %s',projection.table_name,projection.table_name,conflict_columns,update_columns)
        using p_snapshot->projection.table_name;
    end if;
  end loop;
  update public.rooms set mode=incoming.mode,status=incoming.status,started_at=incoming.started_at,completed_at=incoming.completed_at where id=p_room_id;
  return incoming.version;
end $$;
revoke all on function public.persist_engine_snapshot(uuid,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.persist_engine_snapshot(uuid,bigint,text,jsonb) to service_role;

create function public.load_engine_snapshot(p_room_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare snapshot jsonb; projection text; rows jsonb;
begin
  perform 1 from public.rooms where id=p_room_id for share;
  select jsonb_build_object('game_state',to_jsonb(g)) into snapshot from public.game_states g where room_id=p_room_id;
  if snapshot is null then return null; end if;
  foreach projection in array array['proposals','votes','evidence','player_abilities','events','timeline',
    'private_intel','redline_ballots','processed_commands','collaboration_rewards'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t where room_id=$1',projection)
      into rows using p_room_id;
    snapshot := snapshot || jsonb_build_object(projection,rows);
  end loop;
  return snapshot;
end $$;
revoke all on function public.load_engine_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.load_engine_snapshot(uuid) to service_role;
