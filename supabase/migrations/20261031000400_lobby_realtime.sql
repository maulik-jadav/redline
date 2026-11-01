-- Private transport authorization only. Application tables remain server-only.
-- The definer helper exposes one boolean, never membership rows or session hashes.
create function public.can_access_lobby_realtime(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.players p
    join public.rooms r on r.id=p.room_id
    join public.player_sessions s on s.room_id=p.room_id and s.player_id=p.id
    where p.id::text = (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'sub')
      and r.code = (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'redline_room')
      and (nullif(current_setting('request.jwt.claims',true),'')::jsonb ->> 'redline_realtime') = 'true'
      and topic = 'redline:room:' || r.code
      and p.left_at is null and s.revoked_at is null
  );
$$;
revoke all on function public.can_access_lobby_realtime(text) from public,anon;
grant execute on function public.can_access_lobby_realtime(text) to authenticated;

-- realtime.messages and realtime.topic() are provided by Supabase Realtime.
-- Do not alter ownership, grants, or RLS on that managed table.
create policy redline_lobby_receive on realtime.messages for select to authenticated
using (extension in ('broadcast','presence') and public.can_access_lobby_realtime((select realtime.topic())));
create policy redline_lobby_presence on realtime.messages for insert to authenticated
with check (extension='presence' and public.can_access_lobby_realtime((select realtime.topic())));
-- No browser Broadcast INSERT policy: notifications originate on the server.
