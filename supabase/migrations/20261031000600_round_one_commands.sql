-- Server-only authorization and atomic multi-step orchestration; no gameplay rules in SQL.
create function public.get_crisis_members(p_code text,p_player_id uuid,p_token_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare target public.rooms;
begin
  select * into target from public.rooms where code=p_code for share;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if target.status<>'active' or not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=target.id and p.left_at is null and p.role is not null and p.briefing_acknowledged_at is not null
    and s.revoked_at is null and s.token_hash=p_token_hash) then raise exception 'INVALID_SESSION'; end if;
  if exists(select 1 from public.players where room_id=target.id and left_at is null and briefing_acknowledged_at is null) then raise exception 'BRIEFING_UNAVAILABLE'; end if;
  return (select jsonb_agg(jsonb_build_object('id',id,'display_name',display_name,'role',role,'is_host',is_host) order by joined_at,id)
    from public.players where room_id=target.id and left_at is null);
end $$;
revoke all on function public.get_crisis_members(text,uuid,text) from public,anon,authenticated;
grant execute on function public.get_crisis_members(text,uuid,text) to service_role;

create function public.commit_round_one(p_room_id uuid,p_player_id uuid,p_token_hash text,p_expected_version bigint,p_root_command_id text,p_steps jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare current_state public.game_states; step jsonb; next_command text; version bigint; first_step boolean=true;
begin
  perform 1 from public.rooms where id=p_room_id and status='active' for update;
  if not found or not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=p_room_id and p.left_at is null and p.role is not null and p.briefing_acknowledged_at is not null
    and s.revoked_at is null and s.token_hash=p_token_hash) then raise exception 'INVALID_SESSION'; end if;
  select * into current_state from public.game_states where room_id=p_room_id;
  if current_state.status<>'active' or current_state.phase not in ('mission_intro','round_intro','discussion','response_selection','voting','consequence')
    or (current_state.round is not null and current_state.round<>1) then raise exception 'INVALID_PHASE'; end if;
  if exists(select 1 from public.processed_commands where room_id=p_room_id and command_id=p_root_command_id) then return; end if;
  if current_state.version is distinct from p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if current_state.phase='consequence' then raise exception 'INVALID_PHASE'; end if;
  if jsonb_typeof(p_steps) is distinct from 'array' or jsonb_array_length(p_steps) not between 1 and 2 then raise exception 'INVALID_COMMAND'; end if;
  version=p_expected_version;
  for step in select * from jsonb_array_elements(p_steps) loop
    if (step->'game_state'->>'round')::integer is distinct from 1 or step->'game_state'->>'phase' not in ('round_intro','discussion','response_selection','voting','consequence')
      or step->'game_state'->>'status' is distinct from 'active'
      or step->'game_state'->'role_assignments' is distinct from current_state.role_assignments then raise exception 'INVALID_COMMAND'; end if;
    next_command=step->'processed_commands'->-1->>'command_id';
    if first_step and next_command is distinct from p_root_command_id then raise exception 'INVALID_COMMAND'; end if;
    perform public.persist_engine_snapshot(p_room_id,version,next_command,step);
    version=version+1;first_step=false;
  end loop;
end $$;
revoke all on function public.commit_round_one(uuid,uuid,text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.commit_round_one(uuid,uuid,text,bigint,text,jsonb) to service_role;
