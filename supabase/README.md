# REDLINE persistence foundation

The TypeScript engine is authoritative. SQL validates storage shape, references,
bounds, uniqueness, history immutability, and concurrency; it does not resolve
votes, apply metric effects, discover evidence, or calculate results.

## Applying migrations

Apply the files in `migrations/` in filename order to a fresh Supabase project,
using its SQL migration tooling (`supabase db push` when linked), or `psql`:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -f supabase/migrations/20261031000100_persistence_foundation.sql \
  -f supabase/migrations/20261031000200_atomic_engine_persistence.sql \
  -f supabase/migrations/20261031000300_lobby_sessions.sql \
  -f supabase/migrations/20261031000400_lobby_realtime.sql \
  -f supabase/migrations/20261031000500_crisis_briefing.sql \
  -f supabase/migrations/20261031000600_round_one_commands.sql \
  -f supabase/migrations/20261031000700_complete_game.sql
```

No hosted project was configured and no real credentials are included. Supabase
normally supplies the `anon`, `authenticated`, and `service_role` database roles.
The fourth migration requires Supabase's managed `realtime.messages` table and
`realtime.topic()` function. No application-table Realtime publication is created. No local Supabase CLI
configuration is required by this foundation.

## Security and anonymous identity

Every application table has enabled and forced RLS. Its only policy is `server_only`, granted
to `service_role`; `PUBLIC`, `anon`, and `authenticated` have no table privileges.
All persistence/lobby RPCs explicitly revoke browser/PUBLIC execution and grant it
only to `service_role`. They are security-invoker functions with an empty search
path and qualified table references. There are deliberately no permissive
browser application read/write policies: anonymous player tokens are not Supabase Auth JWTs.

Realtime uses a separate five-minute transport JWT issued only after existing
session/membership verification; the anonymous cookie credential remains private.
`can_access_lobby_realtime(topic)` is a narrowly scoped security-definer boolean
helper for managed-table RLS, executable by `authenticated` only. Its fixed empty
search path and qualified queries inspect membership/revocation without exposing
application rows. `realtime.messages` SELECT allows safe Broadcast/Presence receive;
INSERT allows Presence only. There is no browser Broadcast write policy. Application
table grants/policies remain unchanged. See the root README for signing configuration,
private-channel settings, token renewal, cached authorization and advisory Presence.

Current entry/lobby architecture:

1. A server flow issues a private 32-byte random seed in an HttpOnly cookie.
   HMAC-SHA256 with the unique entry request ID derives a 43-character base64url
   credential, reproducible for retries without plaintext database storage.
2. Only its SHA-256 hash is stored in `player_sessions`. Callsigns, room codes,
   and player IDs are not credentials. No account/password/OAuth flow exists.
3. Server routes verify room ID, player ID, credential, and
   revocation before returning any player-specific data or accepting intentions.
4. Server code invokes the engine and commits its accepted state with the
   privileged client. Client-supplied state must never be accepted as an engine result.

`sessions.ts` remains the centralized hash/verification helper. `src/lib/rooms/`
implements issuance/restoration and the Next.js routes manage HttpOnly,
SameSite=Lax, host-only cookies (Secure in production). Never put credentials in
invite URLs, logs, or public responses. Mutation routes validate same-origin JSON
requests and strict input schemas; lobby payloads are explicit safe projections.

The browser client factory uses public environment variables only and performs
no reads. The privileged client and repositories import `server-only` and are
excluded from the browser barrel. All future sensitive reads can use the server
boundary. `getEvidenceForPlayer` and `getIntelligenceForPlayer` verify the session
before applying room + owner/shared/public filters in database queries. Engine
load helpers intentionally read private state and must never become client DTOs.
Token hashes are segregated from player display rows and never returned by the
player repository. Completed results use a separate session-validated server projection.

## Persistence mapping

- `rooms`: UUID identity, unique human code, mode/status, host membership, lifecycle times.
- `players`: UUID membership, callsign, role, readiness, connection/activity and `left_at`.
- `player_sessions`: hashed opaque credentials and revocation, separate from display data.
- `game_states`: one scalar current-state row per room, including six explicit
  flag columns and nonnegative version.
- `proposals`: engine IDs, canonical/player source, status, creator/initiator/selector,
  evidence selection; one active proposal per creator/round.
- `votes`: immutable normal ballots, one per player/proposal.
- `redline_ballots`: the latest final selection per player/room.
- `evidence`: discovered items, independent visibility and verification, owner and content.
- `player_abilities`: ownership and remaining/max uses.
- `events`: ordered game-event presentation records, distinct from decision history.
- `timeline`: ordered, append-oriented authoritative history with structured metadata.
- `private_intel`: owned ordinary intelligence; evidence-linked rows reference
  evidence instead of duplicating its text.
- `processed_commands`: ordered command IDs and first persistence timestamps.
- `collaboration_rewards`: ordered idempotency reward keys.
- `messages`: future chat structure only. Reactions are deferred.
- `lobby_entry_requests`: hashed credential/fingerprint and membership references
  for idempotent create/join submissions; no plaintext token.

The third migration adds transactional create/join, authenticated lobby reads,
and ready/leave operations. Joins lock the room before checking capacity; a table
trigger also prevents direct active inserts/reactivations from exceeding four.
An active-only `lower(display_name)` unique index protects callsigns. Leaving
marks `left_at`, revokes the session, and retains the host reference; no host
migration is performed. Those lobby RPCs do not assign roles or instantiate game state.

The fifth migration adds `players.briefing_acknowledged_at`, a secret-free
`briefing_completed` timeline type, and server-only initiation/context/ack RPCs.
Initiation locks the room, verifies host/session/four ready active operators,
persists unique roles, then calls the accepted snapshot writer for initial and
started engine states inside one transaction. Any error rolls back all projections.
Acknowledgements lock that same room; the final acknowledgement commits the
server-computed engine transition once. Canonical secrets are never stored in SQL.
The context RPC returns only the requesting member's role and ability uses, plus
a role-free acknowledgement status. The server resolves the private briefing from
scenario configuration. Active roles/membership and the started lifecycle are
protected against reassignment, leaving, and returning to waiting.

The sixth migration adds server-only crisis membership authorization and
`commit_round_one`. The latter locks the room, revalidates the session and
acknowledged membership, checks command replay/version, and calls the existing
snapshot writer for each accepted engine step inside one transaction. A vote and
its immediate resolution therefore roll back together on any projection failure.
SQL rejects projections advancing beyond Round 1. No new tables, browser grants,
private subscriptions, or decrementing countdown writes are introduced. Phase
deadlines live in the existing engine state; gameplay snapshots are explicit
server projections, never the privileged persistence snapshot.

The seventh migration adds `commit_gameplay` for all five rounds and completion,
using the same room lock, credential checks, version/replay checks and accepted
snapshot writer. `round_start_metrics` stores the public presentation baseline.
Completed members retain authorized result access. `game_ai` is a seventeenth
forced-RLS, server-only table; `reserve_game_ai` serializes the ten-request budget
with the room lock. No browser grant or application-table subscription is added.

Room/player IDs are UUIDs. Proposal/evidence/event/intel/timeline IDs remain text
because the accepted engine derives namespaced IDs from caller command IDs.
Composite foreign keys prohibit cross-room ownership/votes/references. Nullable
host membership safely breaks the room/player creation dependency.

JSONB is limited to structured map/role assignments, per-player contribution
counters, immutable timeline metadata/event deltas, and the final result object.
Small typed arrays persist resolved rounds, executed response IDs, and the
suppression evidence snapshot. Other collections are normalized tables.

`database.types.ts` is **schema-aligned manual typing**, not generated output.
The RPC JSON return is modeled as `PersistenceSnapshot`. Regenerate/introspect
when Supabase CLI tooling is adopted, preserving the explicit JSON mapping types.
Timestamps use `timestamptz` and normalize to ISO UTC at the domain boundary.
Creation timestamps absent from engine entities mean first persistence time;
proposal resolution timestamps use the authoritative vote-outcome record.

## Atomic writes and resume

`insertInitialGameState` commits version 0 only when no current state exists.
`persistGameStateWithVersion` sends the full normalized projection of one
already-computed engine result to `persist_engine_snapshot` in a single RPC.

The RPC locks the room, checks the expected current version and exact next
version, validates the command ledger, and writes every related projection
inside the same transaction. It refuses removed history or changed immutable
normal votes/events/timeline/ledger rows. Any constraint failure rolls back the
state, history, and command together. There are no unrelated repository writes
pretending to be a transaction. Host/room/player/session initialization uses the
separate `enter_lobby` transaction; individual insert helpers remain storage primitives.

`loadGameState` uses one `load_engine_snapshot` RPC under a compatible room lock,
then explicitly reconstructs the engine state. Stored sequence numbers preserve
array order, including votes, timeline, processed commands, and reward keys.
Snapshot reads and writes must use these RPCs; individual collection helpers are
for scoped administrative/engine inspection, not consistent multi-query resume.

## Validation

`npm run test` runs the 100 engine tests and persistence mapping/repository tests.
Real Postgres tests skip unless `REDLINE_TEST_DATABASE_URL` is supplied.

For database tests use an **empty, disposable database named `redline_test`**.
The runner applies all seven migrations once; use a fresh database for each run.
It creates a minimal managed Realtime table/function fixture in plain Postgres
to test actual RLS; this fixture is test-only and is not a Realtime service.
For plain Postgres, first create Supabase-compatible test roles in its isolated
cluster (`anon`, `authenticated`, and `service_role` with BYPASSRLS) and grant
schema usage. Never use production for these tests.

```sh
REDLINE_TEST_DATABASE_URL='postgresql:///redline_test' npm run test:db
```

The suite exercises migrations, schema constraints, browser denial, transaction
rollback, a complete match resume, concurrent expected-version writers, lobby
sessions, readiness/leaving, duplicate callsigns and simultaneous final-slot joins.
This milestone was validated with local Postgres 14 and a local PostgREST server
through the actual Supabase client and Next.js browser fallback flows. Private-channel
RLS was exercised in Postgres; Realtime connection/Presence behavior used fakes.
No actual local or hosted Supabase Realtime service was exercised.
