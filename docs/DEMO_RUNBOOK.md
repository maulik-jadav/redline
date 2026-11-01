# REDLINE competition demo

Four operators, one city, conflicting information. Rehearse in **Demo** mode.
Allow about five minutes for initiation through the result transition; reading
and discussion affect actual time. Results are deliberately self-paced.

## Before the demo

1. Open the deployed production URL and run `npm run check:production` in its
   configured environment. A configuration pass is not a live connectivity test.
2. Verify all seven migrations and hosted private Realtime. With two isolated
   sessions, observe join, ready, start, acknowledgements, game changes and
   Presence without waiting for fallback polling. Disable the connection once,
   confirm fallback, restore it and verify LIVE again.
3. Prepare four separate browser profiles/private sessions. Same-origin tabs
   share a cookie and represent the same operator. Create a fresh room; join ×3.
4. Turn SOUND ON with a click in each session; check volume. Silence is a safe fallback.
5. Check `AI GAME MASTER` in the server configuration diagnostic. FALLBACK MODE
   is supported. Use canonical protocols if custom analysis is unavailable.
6. Ready all four. Start a stopwatch when the host selects INITIATE CRISIS.

## Rehearse the assigned roles

Assignment is deterministic for the room/initiation identities and cannot be
selected. Read the four resulting dossiers; decide which person will explain
each character. Do not bypass assignment or restart until a preferred role appears.

- Engineer: connect ORACLE timing to the technical evidence; scan Sector 7 in R3.
- Mayor: emphasize civilians and the hospital; demonstrate Emergency Order if useful.
- Executive: access Helix internal records in R3 and decide whether to share.
- Journalist: seek the March report, then publish selected confirmed evidence.

Each operator must review and acknowledge their own briefing. OPEN DOSSIER and
SKIP INTRO skip only local animation, never a gameplay timer or authorization.

## Demo beats

1. Show four different private roles and conflicting directives.
2. R1: share one intel item. Nominate Reduce Sector 7 Load. Use a contentious
   vote (one rejection plus three approvals) to show visible submitted ballots.
3. R2: show the hospital emergency and Medical-sector warning. Reroute Industrial Power.
4. R3: engineer scans Sector 7; executive accesses internal records. Open their
   formal evidence records, then share Transformer Analysis and March Inspection Report.
   Nominate Isolate S7. The Mayor can open its vote with Emergency Order.
5. R4: engineer shares the automatic ORACLE Deployment Log. Show the correlation
   chain. Journalist selects the confirmed March report and publishes it. Show
   the Helix breaking-news card. Vote for Independent Investigation.
6. R5: let the canonical discussion finish. REDLINE has **15 seconds** in Demo.
   Have three operators select the same option promptly. A changed selection
   replaces that operator's previous ballot; three matching selections close it immediately.
7. Show the final consequence and result. Stop the stopwatch at the result transition.
8. Continue through score/directive and the four canonical secrets. NEXT FILE
   advances immediately; SKIP TO TRUTH is available. End on the causal chain and
   actual incident reconstruction.

This path demonstrates existing scenario behavior, not a guaranteed score:
participation, publication and the final selection affect the result. Canonical
Demo timings remain 25-second discussion, 5-second selection window,
10-second normal vote, and 15-second REDLINE vote.

## Emergency fallback

- AI unavailable or timed out: continue with canonical responses; never wait on
  an unavailable custom selection. Narrative falls back to canonical public copy.
- Realtime unavailable: fallback polling keeps authorized snapshots current.
  Confirm the displayed phase before acting; reconnect and verify LIVE when possible.
- Browser disconnected: reopen the same origin/room in its existing profile.
  Refresh restores membership and authoritative phase; do not create a replacement operator.
- Host disconnected: other active clients can advance expired phases. Host-only
  selection rights stay restricted; the canonical default follows the selection timeout.
- No consensus: let REDLINE expire. Deadlock is a valid recorded outcome.
- Do not clear cookies, edit database state, expose secrets, or change timers to rescue a demo.

## Verification status

See `docs/VERIFICATION.md` for measured production-mode local rehearsal, exact
coverage and outstanding hosted verification. Do not call the build deployed
or live-Realtime verified until the deployment checklist is actually complete.
