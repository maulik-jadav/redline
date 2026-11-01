# Competition-build verification

## Local production rehearsal

Verified on 2026-10-31 using an optimized `next build --webpack` followed by
`next start`, real local Postgres 14, PostgREST, ephemeral verification credentials,
and four independent host-cookie origins. This was **not a hosted deployment**.
AI_PROVIDER and AI_API_KEY were explicitly blank. There was no Realtime WebSocket
service; authorized fallback polling drove synchronization.

Two complete Demo matches reached persisted results:

- **P8DH:** City Saved, 7,590 points, grade B, REDLINE deadlock. Authoritative
  initiation-to-final-resolution time: **4:35**. Results were observed at **4:55**
  on the browser stopwatch, including inspection overhead and the result transition.
- **J435:** Miracle Recovery, 7,685 points, grade B, **Manual Takeover consensus**.
  Authoritative initiation-to-final-resolution time: **4:43**. A changed ballot,
  two refreshed REDLINE sessions, and three matching selections were recorded.
  This match also exercised default inaction when ordinary voting expired.

P8DH exercised create/join ×3, all readiness and private acknowledgements, all
five rounds, shared intel, all four abilities, March/technical discoveries,
ORACLE-log sharing, correlation, confirmed publication, normal approvals,
REDLINE expiry, results, personal objective, four canonical secrets, truth
achievement and actual timeline. The host tab was closed during R1; other clients
advanced discussion/selection to the canonical default, approved it, and restored
the host with its original membership. Refreshes covered briefing, discussion,
vote, consequence boundary, round transition, REDLINE and completed results.
An unrelated visitor was denied results. Local server-guarded production cookies
worked in the Chromium loopback rehearsal.

The final compact laptop CSS received a further production smoke check in 5SD3.
At **1280×720**, all three normal nomination buttons ended at y=705, inside the
viewport. The game was also inspected at **1440×900** and **390×844** without
horizontal overflow. Resizing while metric animation was in flight originally
spilled a gauge; clipping and zero-minimum grid tracks corrected it. The final
production bundle, not injected browser CSS, was used for that check.

## Browser, sound and accessibility

- Chromium: actual production gameplay, SVG, animation, clipboard feedback,
  keyboard approval, private session restoration, sound toggle and persisted
  preference. No warnings/errors were reported by the inspected gameplay tab.
- Safari: actual production landing page, entry form and sound toggle smoke
  check in a separate tab. A complete Safari match, HTTPS cookies and clipboard
  behavior were **not** verified. The test tab was closed afterward.
- Sound: short original Web Audio sine cues, no external assets. AudioContext
  activation succeeded following interaction; preference survived navigation and
  reopening. Automated tests cover silent preference restoration, deduplication,
  overlap suppression, mute and unavailable-audio fallback. Physical speaker
  volume/audibility remains part of the demo operator's check.
- Keyboard voting was exercised. Labels, focus styling, textual severity/status,
  accessible sound control and reduced-motion CSS/Motion paths were inspected.
  OS-level reduced-motion emulation was not available and is not claimed.

## Automated validation

All **306 checks** pass: **255 unit/integration** and **51 real Postgres** checks.
All existing tests remain. Added focused checks cover host-disconnected complete
progression, replayed advance commands, late ballots/premature expiry, simultaneous
REDLINE ballots/expiry, exactly-once endings, and sound behavior.

Passed: `npm run typecheck`, `npm run lint`, `npm run test`, configured
`npm run test:db`, `npm run build`, and `npm run audit:privacy`.
Database tests use only a fresh disposable database named redline_test. Their
managed Realtime table fixture tests real RLS, not live WebSocket behavior.

The final production audit covered 36 client JavaScript/source-map files:
four canonical secrets, ten private intel literals, one additional clue, seven
evidence definitions, privileged identifiers and configured secret values were
absent. Runtime session/hidden-state privacy is additionally covered by authorized
payload and denial tests; the audit does not guess credential-shaped strings.

The frozen master SHA-256 remains:
`f3506b5786ca40d03e65ae256908e35955de364579a928a4e9708862290dd982`.
Engine rules, scenario definitions, canonical timers and migrations were unchanged
in Milestone 11. Presentation DTOs gained only public event classification and
completed-result directive display.

## External readiness and remaining issues

- **P0:** None identified in implemented/local-verified behavior.
- **P1 — external deployment blocker:** No hosted Supabase URL/keys/signing
  configuration or authenticated Vercel CLI identity was available. Plugin
  discovery reports Vercel and Supabase DISABLED_BY_ADMIN / NOT_AVAILABLE.
  No hosted migration, private Realtime/Presence, live-to-fallback-to-live test,
  deployed HTTPS smoke test or production URL can be claimed. Complete
  `docs/DEPLOYMENT.md` and its hosted checklist before final demo-readiness signoff.
- **P2 — verification limits:** Real AI provider calls were unavailable; mocked
  timeout/invalid-output/fallback tests pass. Full Safari/physical-audio and
  OS-level reduced-motion checks remain for the operator's device.
- **P3:** No extra gameplay or optional feature work is planned; feature freeze holds.

`npm run check:production` correctly reports configuration readiness blocked and
AI FALLBACK MODE in the current shell. This expected external preflight failure
is separate from the passing build/test commands above.

**Milestone 11 remains incomplete for final hosted-demo signoff because of the P1
external configuration/verification blocker.** No deployment URL was fabricated.

## File manifest

Created (11):

- `src/components/audio/sound-control.tsx`
- `src/hooks/use-game-audio.ts`
- `src/lib/audio/controller.ts`
- `src/lib/audio/events.ts`
- `src/lib/audio/audio.test.ts`
- `src/lib/game-server/hardening.test.ts`
- `scripts/check-production.mjs`
- `vercel.json`
- `docs/DEMO_RUNBOOK.md`
- `docs/DEPLOYMENT.md`
- `docs/VERIFICATION.md`

Modified (25):

- `.env.example`, `README.md`, `package.json`, `vitest.config.mts`
- `scripts/audit-client-privacy.mjs`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/briefing/classified-briefing.tsx`
- `src/components/lobby/lobby-room.tsx`
- `src/components/crisis/command-center.tsx`
- `src/components/crisis/command-panel.tsx`
- `src/components/crisis/decision-overlays.tsx`
- `src/components/crisis/full-game-panels.tsx`
- `src/components/crisis/intelligence.tsx`
- `src/components/crisis/metric-panel.tsx`
- `src/components/crisis/novus-grid.tsx`
- `src/components/results/results-sequence.tsx`
- `src/lib/game-server/results.ts`, `src/lib/game-server/snapshots.ts`
- `src/lib/realtime/server.ts`, `src/lib/supabase/client.ts`
- `src/types/crisis.ts`, `src/types/results-view.ts`
- `supabase/tests/full-game.cases.ts`
