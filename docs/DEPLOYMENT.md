# Production deployment

REDLINE uses Next.js on Vercel and a hosted Supabase project. It is not a static
export. `vercel.json` uses the existing npm build. Use Node 22 or newer.

## Environment

Configure these exact names in Vercel **Production** before deploying:

- `NEXT_PUBLIC_SUPABASE_URL`: the hosted project's HTTPS URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: its public browser key.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key for the same project.
- `SUPABASE_REALTIME_JWT_SECRET`: trusted HS256 signing secret (at least 32 characters)
  matching that project's Realtime verifier. This app's five-minute transport JWTs
  use that existing signing path; an asymmetric signing key is not interchangeable.
- Optional `AI_PROVIDER=anthropic`, `AI_API_KEY`, and `AI_MODEL` (default
  `claude-haiku-4-5`). Leave AI unset for canonical fallback gameplay.

Only the first two names are public. Never prefix another secret with NEXT_PUBLIC.
Public values are embedded at build time; redeploy after changes. Session cookies
are HttpOnly, SameSite=Lax, host-only and Secure in production. Use HTTPS.
Do not put keys, session credentials or signing material into URLs or chat.

Run the safe internal diagnostic in the configured environment:

```sh
npm run check:production
```

It checks configuration presence and URL/signing shape, prints no values, and
reports AI FALLBACK MODE or provider configuration. It does **not** assert a real
AI call, database connectivity, successful migrations or working Realtime.

## Supabase

Use a fresh hosted project or its migration history; never blindly reapply SQL
to an existing database. For a fresh project, set DATABASE_URL privately and run:

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

No Milestone 11 migration is needed. Keep application tables forced-RLS and
browser table/privileged RPC access denied. The managed `realtime.messages`
policies permit authorized private Broadcast receive and Presence; clients do
not receive application-table change streams. In Realtime Settings, disable
**Allow public access**, as described in the
[Supabase authorization documentation](https://supabase.com/docs/guides/realtime/authorization).
Verify the project's signing configuration matches the transport JWT path.

## Vercel

No authenticated Vercel connector or CLI identity was available in this workspace.
An authorized operator can deploy from this directory using the
[official CLI workflow](https://vercel.com/docs/projects/deploy-from-cli):

```sh
npm ci
npx vercel@latest login
npx vercel@latest link
```

Select the intended account/team and project. Set the environment variables in
Project Settings → Environment Variables → Production, or use interactive prompts:

```sh
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel@latest env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel@latest env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel@latest env add SUPABASE_REALTIME_JWT_SECRET production
# Optional AI; omit these for fallback mode.
npx vercel@latest env add AI_PROVIDER production
npx vercel@latest env add AI_API_KEY production
npx vercel@latest env add AI_MODEL production
npx vercel@latest deploy --prod
```

Record the real deployment URL and READY status. Do not share a local verification
URL as a deployment. Authentication-protected previews need access for all four
operators; test production cookies on the final HTTPS origin.

## Mandatory hosted smoke test

- Landing → create → join ×3 → ready → initiate → four private briefings.
- Verify two or more sessions show real LIVE updates for join, ready, start,
  acknowledgement, `game_changed`, and Presence online/offline.
- Interrupt Realtime, confirm polling progression, restore it and verify recovery.
- Complete one Demo match, including a vote refresh and REDLINE refresh.
- Deny an unrelated visitor results access; restore completed-member results.
- Verify sound after interaction, keyboard voting and reduced-motion presentation.
- If enabling AI, make one real provider call and confirm fallback on failure.
  A configured key or a mocked test alone does not verify a real provider.

Missing hosted Realtime verification is a **P1 external deployment blocker** for
final demo readiness. It does not invalidate local deterministic-engine tests.
