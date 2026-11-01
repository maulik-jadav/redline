-- Lobby membership/session transactions only. No roles are assigned and no game is started.
alter table public.players add column left_at timestamptz;
alter table public.players add constraint players_callsign_format
  check (display_name = btrim(display_name) and display_name ~ '^[A-Za-z0-9 _-]{2,20}$');
create unique index players_active_callsign on public.players(room_id,lower(display_name)) where left_at is null;

-- Records contain hashes only. The private issuance cookie lets the server
-- reproduce a request's credential on retry without storing raw credentials.
create table public.lobby_entry_requests (
  request_id uuid primary key,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.lobby_entry_requests enable row level security;
alter table public.lobby_entry_requests force row level security;
revoke all on public.lobby_entry_requests from public,anon,authenticated;
grant select,insert,update,delete on public.lobby_entry_requests to service_role;
create policy server_only on public.lobby_entry_requests to service_role using(true) with check(true);

-- Protect capacity even when storage primitives are used directly. The room row
-- lock serializes all active membership insertions/reactivations for that room.
create function public.redline_check_lobby_capacity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare room_status text;
begin
  if new.left_at is not null then return new; end if;
  select status into room_status from public.rooms where id=new.room_id for update;
  if room_status is null then raise exception 'ROOM_NOT_FOUND'; end if;
  if room_status <> 'waiting' then raise exception 'ROOM_IN_PROGRESS'; end if;
  if (select count(*) from public.players where room_id=new.room_id and left_at is null and id<>new.id)>=4 then
    raise exception 'ROOM_FULL';
  end if;
  return new;
end $$;
revoke all on function public.redline_check_lobby_capacity() from public,anon,authenticated;
create trigger players_capacity before insert or update of room_id,left_at on public.players
  for each row execute function public.redline_check_lobby_capacity();

create function public.enter_lobby(
  p_request_id uuid,p_fingerprint text,p_token_hash text,p_operation text,
  p_room_id uuid,p_player_id uuid,p_code text,p_callsign text,p_mode text
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare prior public.lobby_entry_requests; target public.rooms;
begin
  if p_operation not in ('create','join') or p_callsign is null or p_callsign<>btrim(p_callsign)
    or p_callsign !~ '^[A-Za-z0-9 _-]{2,20}$' or p_code !~ '^[A-Z0-9]{4,8}$'
    or p_token_hash !~ '^[a-f0-9]{64}$' or p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into prior from public.lobby_entry_requests where request_id=p_request_id;
  if found then
    if prior.fingerprint<>p_fingerprint or prior.token_hash<>p_token_hash then raise exception 'INVALID_REQUEST'; end if;
    if not exists(select 1 from public.player_sessions s join public.players p on p.id=s.player_id
      where s.player_id=prior.player_id and s.room_id=prior.room_id and s.token_hash=p_token_hash
        and s.revoked_at is null and p.left_at is null) then raise exception 'INVALID_SESSION'; end if;
    return jsonb_build_object('room_id',prior.room_id,'player_id',prior.player_id,'code',(select code from public.rooms where id=prior.room_id));
  end if;
  if p_operation='create' then
    if p_mode is null or p_mode not in ('standard','demo') then raise exception 'INVALID_MODE'; end if;
    begin
      insert into public.rooms(id,code,scenario_id,mode,status) values(p_room_id,p_code,'blackout',p_mode,'waiting');
    exception when unique_violation then raise exception 'ROOM_CODE_COLLISION'; end;
    select * into target from public.rooms where id=p_room_id for update;
  else
    select * into target from public.rooms where code=p_code for update;
    if not found then raise exception 'ROOM_NOT_FOUND'; end if;
    if target.status<>'waiting' then raise exception 'ROOM_IN_PROGRESS'; end if;
  end if;
  if (select count(*) from public.players where room_id=target.id and left_at is null)>=4 then raise exception 'ROOM_FULL'; end if;
  if exists(select 1 from public.players where room_id=target.id and left_at is null and lower(display_name)=lower(p_callsign)) then
    raise exception 'CALLSIGN_TAKEN'; end if;
  begin
    insert into public.players(id,room_id,display_name,is_host) values(p_player_id,target.id,p_callsign,p_operation='create');
  exception when unique_violation then raise exception 'CALLSIGN_TAKEN'; end;
  insert into public.player_sessions(player_id,room_id,token_hash) values(p_player_id,target.id,p_token_hash);
  if p_operation='create' then update public.rooms set host_player_id=p_player_id where id=target.id; end if;
  insert into public.lobby_entry_requests(request_id,fingerprint,token_hash,room_id,player_id)
    values(p_request_id,p_fingerprint,p_token_hash,target.id,p_player_id);
  return jsonb_build_object('room_id',target.id,'player_id',p_player_id,'code',target.code);
end $$;
revoke all on function public.enter_lobby(uuid,text,text,text,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.enter_lobby(uuid,text,text,text,uuid,uuid,text,text,text) to service_role;

create function public.get_lobby_snapshot(p_code text,p_player_id uuid,p_token_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare target public.rooms;
begin
  select * into target from public.rooms where code=p_code for share;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=target.id and p.left_at is null and s.revoked_at is null and s.token_hash=p_token_hash) then
    raise exception 'INVALID_SESSION'; end if;
  return jsonb_build_object('code',target.code,'mode',target.mode,'status',target.status,'selfPlayerId',p_player_id,
    'players',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'displayName',p.display_name,'isHost',p.is_host,'isReady',p.is_ready)
      order by p.joined_at,p.id),'[]'::jsonb) from public.players p where p.room_id=target.id and p.left_at is null));
end $$;
revoke all on function public.get_lobby_snapshot(text,uuid,text) from public,anon,authenticated;
grant execute on function public.get_lobby_snapshot(text,uuid,text) to service_role;

create function public.update_lobby_member(p_room_id uuid,p_player_id uuid,p_token_hash text,p_action text,p_ready boolean default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare room_status text;
begin
  select status into room_status from public.rooms where id=p_room_id for update;
  if not exists(select 1 from public.players p join public.player_sessions s on s.player_id=p.id and s.room_id=p.room_id
    where p.id=p_player_id and p.room_id=p_room_id and p.left_at is null and s.revoked_at is null and s.token_hash=p_token_hash) then
    raise exception 'INVALID_SESSION'; end if;
  if p_action='ready' then
    if room_status<>'waiting' then raise exception 'ROOM_IN_PROGRESS'; end if;
    if p_ready is null then raise exception 'INVALID_REQUEST'; end if;
    update public.players set is_ready=p_ready,updated_at=now() where id=p_player_id and room_id=p_room_id;
  elsif p_action='leave' then
    update public.players set left_at=now(),is_ready=false,connection_status='disconnected',updated_at=now() where id=p_player_id and room_id=p_room_id;
    update public.player_sessions set revoked_at=now() where player_id=p_player_id and room_id=p_room_id;
  else raise exception 'INVALID_REQUEST'; end if;
end $$;
revoke all on function public.update_lobby_member(uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.update_lobby_member(uuid,uuid,text,text,boolean) to service_role;
