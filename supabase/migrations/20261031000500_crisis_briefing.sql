alter table public.players add column briefing_acknowledged_at timestamptz;
alter table public.timeline drop constraint timeline_type_check;
alter table public.timeline add constraint timeline_type_check check (type in (
  'game_start','briefing_completed','round_start','intelligence_shared','ability_used','proposal_selected',
  'vote_outcome','inaction_consequence','decision_executed','public_disclosure','helix_exposed',
  'suppression_exposed','redline_activated','final_vote','ending'));

create function public.protect_started_membership() returns trigger
language plpgsql security invoker set search_path='' as $$
declare room_status text;
begin
  select status into room_status from public.rooms where id=old.room_id for update;
  if room_status<>'waiting' then
    if new.left_at is distinct from old.left_at then raise exception 'CRISIS_ACTIVE'; end if;
    if new.role is distinct from old.role or new.room_id is distinct from old.room_id then raise exception 'ROLE_IMMUTABLE'; end if;
  end if;
  return new;
end $$;
revoke all on function public.protect_started_membership() from public,anon,authenticated;
create trigger protect_started_membership before update of role,room_id,left_at on public.players
for each row execute function public.protect_started_membership();

create function public.protect_room_lifecycle() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.status<>'waiting' and new.status='waiting' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  return new;
end $$;
revoke all on function public.protect_room_lifecycle() from public,anon,authenticated;
create trigger protect_room_lifecycle before update of status on public.rooms
for each row execute function public.protect_room_lifecycle();

create function public.initiate_crisis(p_room_id uuid,p_player_id uuid,p_token_hash text,p_command_id text,p_initial jsonb,p_started jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare target public.rooms; assignments jsonb; assignment record;
begin
  select * into target from public.rooms where id=p_room_id for update;
  if not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=p_room_id and p.left_at is null and s.revoked_at is null and s.token_hash=p_token_hash) then raise exception 'INVALID_SESSION'; end if;
  if target.host_player_id is distinct from p_player_id or not exists(select 1 from public.players where id=p_player_id and is_host) then raise exception 'NOT_HOST'; end if;
  if target.status<>'waiting' then raise exception 'ROOM_ALREADY_STARTED'; end if;
  if (select count(*) from public.players where room_id=p_room_id and left_at is null)<>4 then raise exception 'ROOM_NOT_FULL'; end if;
  if exists(select 1 from public.players where room_id=p_room_id and left_at is null and not is_ready) then raise exception 'PLAYERS_NOT_READY'; end if;
  assignments=p_initial->'game_state'->'role_assignments';
  if jsonb_typeof(assignments) is distinct from 'object' or (select count(*) from jsonb_each(assignments))<>4
    or not assignments ?& array['engineer','mayor','executive','journalist']
    or (select count(distinct value) from jsonb_each_text(assignments))<>4
    or assignments is distinct from p_started->'game_state'->'role_assignments'
    or p_initial->'game_state'->>'phase' is distinct from 'lobby'
    or p_started->'game_state'->>'phase' is distinct from 'briefing'
    or p_started->'game_state'->>'status' is distinct from 'active'
    or p_initial->'game_state'->>'mode' is distinct from target.mode
    or p_started->'game_state'->>'mode' is distinct from target.mode then raise exception 'INVALID_START'; end if;
  for assignment in select * from jsonb_each_text(assignments) loop
    if not exists(select 1 from public.players where id=assignment.value::uuid and room_id=p_room_id and left_at is null) then raise exception 'INVALID_START'; end if;
    update public.players set role=assignment.key where id=assignment.value::uuid and room_id=p_room_id;
  end loop;
  -- Reuse the accepted snapshot writer twice inside this ONE transaction.
  perform public.persist_engine_snapshot(p_room_id,null,null,p_initial);
  perform public.persist_engine_snapshot(p_room_id,0,p_command_id,p_started);
end $$;
revoke all on function public.initiate_crisis(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.initiate_crisis(uuid,uuid,text,text,jsonb,jsonb) to service_role;

create function public.get_briefing_context(p_code text,p_player_id uuid,p_token_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare target public.rooms; member public.players; phase text; uses integer; acknowledged integer;
begin
  select * into target from public.rooms where code=p_code for share;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  select * into member from public.players where id=p_player_id and room_id=target.id and left_at is null;
  if not found or not exists(select 1 from public.player_sessions where player_id=p_player_id and room_id=target.id and token_hash=p_token_hash and revoked_at is null) then raise exception 'INVALID_SESSION'; end if;
  if target.status='waiting' then raise exception 'ROOM_NOT_STARTED'; end if;
  select g.phase into phase from public.game_states g where room_id=target.id;
  if target.status<>'active' or phase is null or phase not in ('briefing','mission_intro') or member.role is null then raise exception 'BRIEFING_UNAVAILABLE'; end if;
  select uses_remaining into uses from public.player_abilities where room_id=target.id and player_id=member.id and owner_role=member.role;
  if uses is null then raise exception 'BRIEFING_UNAVAILABLE'; end if;
  select count(*) into acknowledged from public.players where room_id=target.id and left_at is null and briefing_acknowledged_at is not null;
  return jsonb_build_object('self',jsonb_build_object('role',member.role,'displayName',member.display_name,'uses',uses),
    'status',jsonb_build_object('code',target.code,'status',target.status,'phase',phase,'selfPlayerId',member.id,
      'acknowledgedCount',acknowledged,'allAcknowledged',acknowledged=4,
      'operators',(select jsonb_agg(jsonb_build_object('id',id,'displayName',display_name,'acknowledged',briefing_acknowledged_at is not null) order by joined_at,id)
        from public.players where room_id=target.id and left_at is null)));
end $$;
revoke all on function public.get_briefing_context(text,uuid,text) from public,anon,authenticated;
grant execute on function public.get_briefing_context(text,uuid,text) to service_role;

create function public.acknowledge_briefing(p_room_id uuid,p_player_id uuid,p_token_hash text,p_expected_version bigint,p_next jsonb,p_command_id text)
returns void language plpgsql security invoker set search_path='' as $$
declare room_status text; phase text; version bigint;
begin
  select status into room_status from public.rooms where id=p_room_id for update;
  if not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=p_room_id and p.left_at is null and p.role is not null and s.revoked_at is null and s.token_hash=p_token_hash) then raise exception 'INVALID_SESSION'; end if;
  select g.phase,g.version into phase,version from public.game_states g where room_id=p_room_id;
  if room_status<>'active' or phase is null or phase not in ('briefing','mission_intro') then raise exception 'ROOM_NOT_STARTED'; end if;
  if exists(select 1 from public.players where id=p_player_id and briefing_acknowledged_at is not null) then return; end if;
  update public.players set briefing_acknowledged_at=now() where id=p_player_id and room_id=p_room_id;
  if phase='briefing' and (select count(*) from public.players where room_id=p_room_id and left_at is null and briefing_acknowledged_at is not null)=4 then
    if p_expected_version is distinct from version or p_next->'game_state'->>'phase' is distinct from 'mission_intro'
      or p_command_id is distinct from 'briefing-complete:'||p_room_id::text then raise exception 'INVALID_COMPLETION'; end if;
    perform public.persist_engine_snapshot(p_room_id,version,p_command_id,p_next);
  end if;
end $$;
revoke all on function public.acknowledge_briefing(uuid,uuid,text,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function public.acknowledge_briefing(uuid,uuid,text,bigint,jsonb,text) to service_role;
