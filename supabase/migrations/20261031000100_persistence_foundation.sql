-- Persistence invariants only. All gameplay decisions remain in the TypeScript engine.
create table public.rooms (
  id uuid primary key,
  code text not null unique check (code ~ '^[A-Z0-9]{4,8}$'),
  scenario_id text not null check (scenario_id = 'blackout'),
  mode text not null check (mode in ('standard','demo')),
  status text not null check (status in ('waiting','active','completed')),
  host_player_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.players (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 40),
  role text check (role in ('engineer','mayor','executive','journalist')),
  is_host boolean not null default false,
  is_ready boolean not null default false,
  connection_status text not null default 'online' check (connection_status in ('online','disconnected')),
  activity text not null default 'idle' check (activity in ('idle','typing','voting')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id,id)
);
create unique index players_room_role on public.players(room_id,role) where role is not null;
create unique index players_room_host on public.players(room_id) where is_host;
alter table public.rooms add constraint rooms_host_membership
  foreign key (id,host_player_id) references public.players(room_id,id) deferrable initially deferred;

-- Secrets are separated from display/player rows and never granted to browser roles.
create table public.player_sessions (
  player_id uuid primary key,
  room_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (room_id,player_id) references public.players(room_id,id) on delete cascade
);

-- Engine-derived IDs are namespaced strings, not UUIDs; retain them losslessly.
create table public.proposals (
  id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  room_id uuid not null references public.rooms(id) on delete cascade,
  round smallint not null check (round between 1 and 4),
  creator_player_id uuid,
  title text not null,
  action text not null,
  reason text not null,
  source text not null check (source in ('player','canonical')),
  status text not null check (status in ('pending','selected','voting','approved','rejected','expired','executed')),
  canonical_response_id text,
  disclosure_evidence text[] not null default '{}',
  selected_by uuid,
  initiated_by uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  primary key (room_id,id),
  check ((source = 'player' and creator_player_id is not null and canonical_response_id is null)
    or (source = 'canonical' and creator_player_id is null and canonical_response_id is not null)),
  foreign key (room_id,creator_player_id) references public.players(room_id,id),
  foreign key (room_id,selected_by) references public.players(room_id,id),
  foreign key (room_id,initiated_by) references public.players(room_id,id)
);
create unique index proposals_one_active_creator on public.proposals(room_id,round,creator_player_id)
  where source = 'player' and status in ('pending','selected','voting');
create index proposals_room_round on public.proposals(room_id,round);

create table public.votes (
  room_id uuid not null,
  proposal_id text not null,
  player_id uuid not null,
  choice text not null check (choice in ('approve','reject')),
  sequence_no integer not null check (sequence_no >= 0),
  created_at timestamptz not null default now(),
  primary key (room_id,proposal_id,player_id),
  foreign key (room_id,proposal_id) references public.proposals(room_id,id) on delete cascade,
  foreign key (room_id,player_id) references public.players(room_id,id)
);

create table public.redline_ballots (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  choice text not null check (choice in ('total_grid_shutdown','trust_oracle','manual_takeover')),
  updated_at timestamptz not null default now(),
  primary key (room_id,player_id),
  foreign key (room_id,player_id) references public.players(room_id,id)
);

create table public.evidence (
  id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  room_id uuid not null references public.rooms(id) on delete cascade,
  key text not null check (key in ('oracle_build_7_4_deployment','march_inspection_report','anonymous_s7_warning',
    'anonymous_partial_march_report','hospital_impact_report','transformer_degradation_analysis','failure_correlation_analysis')),
  title text not null,
  description text not null,
  owner_player_id uuid,
  visibility text not null check (visibility in ('private','shared','public')),
  verification text not null check (verification in ('unverified','confirmed','contradicted')),
  discovered_round smallint check (discovered_round between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id,id),
  unique (room_id,key),
  check (visibility <> 'private' or owner_player_id is not null),
  foreign key (room_id,owner_player_id) references public.players(room_id,id)
);
create index evidence_room_owner on public.evidence(room_id,owner_player_id);

create table public.player_abilities (
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null,
  ability_id text not null check (ability_id in ('diagnostic_scan','emergency_order','corporate_intel','breaking_leak')),
  owner_role text not null check (owner_role in ('engineer','mayor','executive','journalist')),
  max_uses smallint not null check (max_uses >= 0),
  uses_remaining smallint not null check (uses_remaining >= 0 and uses_remaining <= max_uses),
  updated_at timestamptz not null default now(),
  primary key (room_id,ability_id),
  unique (room_id,player_id),
  foreign key (room_id,player_id) references public.players(room_id,id)
);

create table public.events (
  room_id uuid not null references public.rooms(id) on delete cascade,
  id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  round smallint check (round between 1 and 5),
  type text not null check (type in ('round_event','critical_event','decision','system','npc_message','broadcast')),
  severity text not null check (severity in ('info','warning','critical')),
  headline text not null,
  description text not null,
  metric_effects jsonb,
  primary key (room_id,id),
  unique (room_id,sequence_no),
  check (metric_effects is null or jsonb_typeof(metric_effects) = 'object')
);

create table public.timeline (
  room_id uuid not null references public.rooms(id) on delete cascade,
  id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  type text not null check (type in ('game_start','round_start','intelligence_shared','ability_used','proposal_selected',
    'vote_outcome','inaction_consequence','decision_executed','public_disclosure','helix_exposed','suppression_exposed',
    'redline_activated','final_vote','ending')),
  round smallint check (round between 1 and 5),
  player_id uuid,
  message text not null,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  primary key (room_id,id),
  unique (room_id,sequence_no),
  foreign key (room_id,player_id) references public.players(room_id,id)
);
create index timeline_room_time on public.timeline(room_id,occurred_at);

-- Linked evidence supplies content at read time; ordinary private intel keeps its own text.
create table public.private_intel (
  room_id uuid not null references public.rooms(id) on delete cascade,
  id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  player_id uuid not null,
  round smallint not null check (round between 1 and 5),
  content text,
  confidence text check (confidence in ('low','medium','high')),
  additional_clues text[],
  visibility text not null check (visibility in ('private','shared','public')),
  evidence_key text,
  primary key (room_id,id),
  unique (room_id,sequence_no),
  check ((evidence_key is null and content is not null) or (evidence_key is not null and content is null)),
  foreign key (room_id,player_id) references public.players(room_id,id),
  foreign key (room_id,evidence_key) references public.evidence(room_id,key)
);
create index private_intel_room_owner on public.private_intel(room_id,player_id);

create table public.game_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  scenario_id text not null check (scenario_id = 'blackout'),
  mode text not null check (mode in ('standard','demo')),
  status text not null check (status in ('waiting','active','completed')),
  phase text not null check (phase in ('lobby','briefing','mission_intro','round_intro','discussion','response_selection',
    'voting','resolution','consequence','redline_protocol','results')),
  round smallint check (round between 1 and 5),
  grid integer not null check (grid between 0 and 100),
  safety integer not null check (safety between 0 and 100),
  economy integer not null check (economy between 0 and 100),
  trust integer not null check (trust between 0 and 100),
  cascade_risk integer not null check (cascade_risk between 0 and 100),
  collaboration_score integer not null check (collaboration_score between 0 and 100),
  helix_exposed boolean not null,
  information_suppressed boolean not null,
  suppression_exposed boolean not null,
  true_cause_discovered boolean not null,
  confirmed_wrongdoing_published boolean not null,
  s7_isolated boolean not null,
  selected_proposal_id text,
  active_event_id text,
  phase_ends_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  version bigint not null check (version >= 0 and version <= 9007199254740991),
  map jsonb not null check (jsonb_typeof(map) = 'object'),
  role_assignments jsonb not null check (jsonb_typeof(role_assignments) = 'object'),
  resolved_rounds smallint[] not null default '{}',
  executed_responses text[] not null default '{}',
  suppression_evidence_snapshot text[] not null default '{}',
  contributions jsonb not null check (jsonb_typeof(contributions) = 'object'),
  redline_resolution text check (redline_resolution in ('total_grid_shutdown','trust_oracle','manual_takeover','deadlock')),
  result jsonb check (result is null or jsonb_typeof(result) = 'object'),
  updated_at timestamptz not null,
  foreign key (room_id,selected_proposal_id) references public.proposals(room_id,id) deferrable initially deferred,
  foreign key (room_id,active_event_id) references public.events(room_id,id) deferrable initially deferred
);

create table public.processed_commands (
  room_id uuid not null references public.rooms(id) on delete cascade,
  command_id text not null,
  sequence_no integer not null check (sequence_no >= 0),
  processed_at timestamptz not null,
  primary key (room_id,command_id),
  unique (room_id,sequence_no)
);
create table public.collaboration_rewards (
  room_id uuid not null references public.rooms(id) on delete cascade,
  reward_key text not null,
  sequence_no integer not null check (sequence_no >= 0),
  primary key (room_id,reward_key),
  unique (room_id,sequence_no)
);

create table public.messages (
  id uuid primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid,
  message text not null check (length(btrim(message)) between 1 and 4000),
  message_type text not null check (message_type in ('chat','system','intel_shared','decision','warning')),
  created_at timestamptz not null default now(),
  foreign key (room_id,player_id) references public.players(room_id,id)
);
create index messages_room_time on public.messages(room_id,created_at);

-- Fail closed: no browser policies or grants. Anonymous sessions are verified by
-- the server; even public/shared room data is read through that future boundary.
do $$
declare t text;
begin
  foreach t in array array['rooms','players','player_sessions','game_states','proposals','votes',
    'redline_ballots','evidence','player_abilities','events','timeline','private_intel',
    'processed_commands','collaboration_rewards','messages'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
    execute format('create policy server_only on public.%I to service_role using (true) with check (true)',t);
  end loop;
end $$;

-- Storage immutability, not game rules: history and normal votes cannot be rewritten.
create function public.redline_reject_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'IMMUTABLE_RECORD' using errcode = '23514';
end $$;
revoke all on function public.redline_reject_update() from public,anon,authenticated;
create trigger votes_immutable before update on public.votes for each row execute function public.redline_reject_update();
create trigger timeline_immutable before update on public.timeline for each row execute function public.redline_reject_update();
create trigger events_immutable before update on public.events for each row execute function public.redline_reject_update();
