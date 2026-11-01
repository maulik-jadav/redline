# REDLINE — Master Product Specification

**Version:** 1.0  
**Status:** FROZEN  
**Scenario:** BLACKOUT  
**Players:** 4  
**Target Match Length:** 8–12 minutes  
**Demo Mode Length:** 4–6 minutes

---

# 1. Purpose of This Document

This document is the authoritative product specification for **REDLINE**.

All implementation work must follow this specification.

When implementing REDLINE:

- Do not redesign the core gameplay.
- Do not change canonical story facts.
- Do not change roles, secrets, objectives, abilities, rounds, evidence, metric effects, or endings unless explicitly instructed.
- Do not add major features outside this specification.
- Do not allow AI-generated content to override deterministic game rules.
- Implement only the milestone requested by the current development prompt.
- Do not proactively implement future milestones.

If an implementation request conflicts with this document, identify the conflict rather than silently changing the specification.

---

# 2. Product

## Name

**REDLINE**

## Tagline

**Nobody has the whole truth. Everyone has to make the decision.**

## Scenario

**BLACKOUT — Novus City, 2042**

## Core Concept

REDLINE is a real-time multiplayer AI crisis simulation for exactly four players.

Four people enter an emergency command center during a catastrophic electrical-grid failure.

Each player has:

- a unique role;
- different private intelligence;
- a hidden secret;
- a personal objective;
- a special ability;
- incomplete knowledge of the crisis.

Players must communicate, investigate, selectively reveal information, propose actions, vote, and manage a shared city under time pressure.

Their decisions modify the same world state.

The central design principle is:

> **Nobody has the whole truth.**

---

# 3. Core Gameplay Pillars

Every major feature should support one or more of these principles.

## 3.1 Asymmetric Information

Different players receive different information.

No player begins with enough information to independently understand the entire crisis.

## 3.2 Shared Consequences

All players affect the same city.

Successful and unsuccessful decisions change shared metrics and future events.

## 3.3 Strategic Disclosure

Private information does not automatically become public.

Players decide whether information should be:

- kept private;
- discussed verbally/chat;
- formally shared into the evidence system;
- publicly leaked.

## 3.4 Time Pressure

Players cannot investigate indefinitely.

Discussion and voting occur under timers.

## 3.5 Conflicting Incentives

Team survival and individual objectives are related but not identical.

## 3.6 Uncertain Truth

Some information may initially be incomplete, unverified, or misleading.

## 3.7 Cinematic Consequences

Major decisions must visibly affect the game world.

---

# 4. Canonical Match Structure

A match follows this sequence:

```text
LOBBY
  ↓
ROLE REVEAL
  ↓
MISSION BRIEFING
  ↓
ROUND 1 — GRID ANOMALY
  ↓
ROUND 2 — LIFE SUPPORT
  ↓
ROUND 3 — CASCADE
  ↓
ROUND 4 — THE LEAK
  ↓
ROUND 5 — SYSTEM FAILURE
  ↓
FINAL — REDLINE PROTOCOL
  ↓
OUTCOME
  ↓
TEAM SCORE
  ↓
PERSONAL OBJECTIVES
  ↓
SECRET REVEAL
  ↓
THE TRUTH
  ↓
TIMELINE
```

---

# 5. Game Modes

Only two game modes are required.

## Standard Mode

Target match length:

**8–12 minutes**

Discussion timer:

**60 seconds**

Normal voting timer:

**20 seconds**

Final REDLINE voting timer:

**30 seconds**

## Demo Mode

Designed for hackathon judging.

Target:

**4–6 minutes**

Discussion timer:

**25 seconds**

Normal voting timer:

**10 seconds**

Final REDLINE voting timer:

**15 seconds**

Demo Mode must preserve the same gameplay mechanics.

It only accelerates timing and guarantees important story beats.

---

# 6. Setting

## Location

**Novus City**

## Year

**2042**

## Population

**3.2 million**

## Energy Provider

**Helix Energy**

## Grid Management AI

**ORACLE**

ORACLE dynamically manages and redistributes electrical power throughout Novus City.

Six hours before the game begins, an experimental optimization update was deployed.

---

# 7. Canonical Truth

This information is immutable.

AI-generated content must never contradict it.

Three months before the crisis, Helix Energy discovered serious physical degradation in **Transformer Cluster S7**.

Replacing S7 would require:

- shutting down important industrial customers;
- approximately $18 million in repairs;
- publicly acknowledging infrastructure problems.

Helix delayed the replacement.

Six hours before the crisis, Grid Engineer Dr. Maya Chen authorized deployment of **ORACLE Optimization Build 7.4** despite incomplete load testing.

Build 7.4 aggressively redistributed electrical load.

The increased load exposed the already-degraded S7 transformer cluster to conditions it could no longer tolerate.

The resulting thermal overload triggered cascading failures.

Therefore:

**ORACLE did not independently cause the crisis.**

**Helix did not independently cause the crisis.**

The canonical root cause is:

```text
PRE-EXISTING S7 DEGRADATION
        +
DELAYED MAINTENANCE
        +
ORACLE BUILD 7.4
        ↓
AGGRESSIVE LOAD REDISTRIBUTION
        ↓
THERMAL OVERLOAD
        ↓
TRANSFORMER FAILURE
        ↓
GRID CASCADE
```

The crisis has no single cause.

---

# 8. Player Roles

Exactly four roles exist.

---

# 8.1 Grid Engineer

## Character

**Dr. Maya Chen**

## Title

**Chief Grid Systems Engineer**

## Public Responsibility

Responsible for ORACLE and Novus City's electrical infrastructure.

## Secret

Six hours before the crisis, Maya authorized deployment of ORACLE Optimization Build 7.4 despite incomplete load testing.

## Primary Objective

**KEEP THE GRID ALIVE**

Success condition:

```text
Grid Stability >= 55
```

## Bonus Objective

Avoid becoming solely blamed for the crisis.

## Ability

### DIAGNOSTIC SCAN

Maximum uses:

**3**

Can investigate:

- grid sectors;
- transformers;
- ORACLE subsystems.

Diagnostic Scan produces high-confidence technical intelligence.

---

# 8.2 Mayor

## Character

**Elena Torres**

## Title

**Mayor of Novus City**

## Public Responsibility

Responsible for protecting 3.2 million residents and coordinating emergency response.

## Secret

Tomorrow is election day.

Internal polling indicates that a major emergency-response failure will probably end Elena's political career.

## Primary Objective

**PROTECT THE CITY**

Success conditions:

```text
Safety >= 70
AND
Trust >= 50
```

## Ability

### EMERGENCY ORDER

Maximum uses:

**1**

Immediately forces an eligible active proposal into voting.

---

# 8.3 Helix Executive

## Character

**Marcus Vale**

## Title

**Chief Operations Officer — Helix Energy**

## Public Responsibility

Represents the company responsible for Novus City's electrical infrastructure.

## Secret

Three months before the crisis, Marcus received a report recommending immediate replacement of Transformer Cluster S7.

Marcus approved delaying the replacement until the next fiscal quarter.

## Primary Objective

**PROTECT HELIX**

Success conditions:

```text
Economy >= 55
AND
helixExposed === false
```

## Ability

### CORPORATE INTEL

Maximum uses:

**2**

Accesses confidential Helix records.

Information discovered through Corporate Intel remains private until voluntarily shared.

---

# 8.4 Investigative Journalist

## Character

**Lena Okafor**

## Title

**Investigative Journalist — Novus News Network**

## Public Responsibility

Reports on the crisis from inside the emergency command center.

## Secret

Before the crisis, an anonymous Helix engineer contacted Lena.

The source claimed Helix had ignored dangerous infrastructure warnings.

Lena does not initially possess enough confirmed evidence to responsibly publish the allegation.

## Primary Objective

**UNCOVER THE TRUTH**

Success condition:

```text
trueCauseDiscovered === true
```

## Bonus Objective

Publish confirmed evidence of wrongdoing.

## Ability

### BREAKING LEAK

Maximum uses:

**1**

Publishes selected evidence to the public.

Publishing confirmed evidence may expose Helix.

Publishing unverified evidence may damage Public Trust.

---

# 9. Shared Metrics

The game has four public metrics.

| Metric | Initial Value |
|---|---:|
| Grid Stability | 72 |
| Civilian Safety | 84 |
| Economic Stability | 76 |
| Public Trust | 68 |

All public metrics must remain within:

```text
0 <= metric <= 100
```

---

# 10. Hidden Metric

The game contains one hidden global metric.

## Cascade Risk

Initial value:

```text
24
```

Bounds:

```text
0 <= Cascade Risk <= 100
```

Cascade Risk is not normally displayed numerically to players.

Players may receive clues about it through:

- ORACLE warnings;
- technical intelligence;
- events;
- role abilities.

---

# 11. Evidence States

Evidence may have one of the following states:

```text
private
unverified
confirmed
contradicted
```

Private evidence is visible only to its authorized owner.

Shared evidence becomes visible to all players.

Sharing formal evidence is irreversible.

---

# 12. Canonical Evidence

Important evidence includes:

1. ORACLE Build 7.4 deployment log.
2. S7 March inspection report.
3. Anonymous S7 warning.
4. Hospital impact report.
5. Transformer degradation analysis.
6. Failure correlation analysis.

---

# 13. Round 1 — GRID ANOMALY

## Public Event

**GRID ANOMALY DETECTED**

Public narrative:

> ORACLE has detected abnormal power oscillations across Sector 7.

Sector 7 map status becomes:

```text
WARNING
```

## Private Intelligence

### Engineer

> ORACLE began aggressive load redistribution approximately six hours ago — shortly after Build 7.4 was deployed.

Confidence:

**HIGH**

### Mayor

> Sector 7 contains St. Anne's Medical District and approximately 210,000 residents.

Confidence:

**HIGH**

### Executive

> Helix maintenance records classify Transformer Cluster S7 as "monitor closely."

Confidence:

**MEDIUM**

### Journalist

> Your anonymous source previously mentioned "S7" during your conversations.

Confidence:

**LOW**

## Suggested Decision A — Reduce Sector 7 Load

Effects:

```text
grid          +4
safety         0
economy       -6
trust         +1
cascadeRisk  -10
```

## Suggested Decision B — Maintain Normal Operations

Effects:

```text
grid          -3
safety         0
economy       +2
trust          0
cascadeRisk  +12
```

## Suggested Decision C — Investigate Before Acting

Effects:

```text
grid          -1
safety         0
economy        0
trust          0
cascadeRisk   +6
```

---

# 14. Round 2 — LIFE SUPPORT

## Public Event

**ST. ANNE'S POWER FAILURE**

Low-risk variant:

> Grid instability has forced St. Anne's Hospital onto backup power.

High-risk variant:

> A transformer failure has disconnected St. Anne's Hospital from the primary grid.

## Base Effects

```text
safety -5
trust  -2
```

Severity may modify these effects within deterministic game-engine limits.

## Private Intelligence

### Engineer

> Hospital backup generators can sustain critical systems for approximately six minutes.

### Mayor

> St. Anne's ICU currently supports 37 critical patients.

### Executive

> Industrial District 4 has enough capacity to power the hospital, but rerouting it will trigger contractual penalties.

### Journalist

> Hospital administrators warned Helix about unstable power twice this month.

## Suggested Decision A — Reroute Industrial Power

```text
grid          -3
safety       +12
economy       -9
trust         +5
cascadeRisk   +4
```

## Suggested Decision B — Emergency Generators Only

```text
grid           0
safety        +4
economy       -2
trust         -1
cascadeRisk    0
```

## Suggested Decision C — Stabilize Grid Before Hospital

```text
grid          +8
safety       -12
economy       +1
trust         -8
cascadeRisk  -10
```

---

# 15. Round 3 — CASCADE

## Public Event

**CASCADING GRID FAILURE**

Transportation control systems begin failing.

Suggested map state:

```text
SECTOR 7    CRITICAL
MEDICAL     WARNING
CENTRAL     WARNING
TRANSIT     CRITICAL
```

## Base Effects

```text
grid     -7
safety   -4
economy  -5
trust    -3
```

## Private Intelligence

### Engineer

> Transformer temperatures are significantly beyond safe operating range.

Additional clue:

> The pattern does not resemble a cyberattack.

### Mayor

> Emergency services report 23 traffic collisions after signal failures.

### Executive

> A restricted maintenance report exists for Transformer Cluster S7.

Corporate Intel may reveal the full report.

### Journalist

> "Ask Vale about the March inspection."

---

# 16. March Inspection Report

If Marcus uses Corporate Intel appropriately, he receives:

**MARCH INSPECTION REPORT**

```text
TRANSFORMER CLUSTER S7

STATUS:
CRITICAL DEGRADATION

RECOMMENDATION:
IMMEDIATE REPLACEMENT

FAILURE RISK:
SEVERE
```

This information initially remains private.

Marcus may either:

```text
KEEP CLASSIFIED
```

or:

```text
SHARE WITH ROOM
```

---

# 17. Engineer S7 Analysis

Diagnostic Scan on S7 may reveal:

**TRANSFORMER ANALYSIS**

> Physical degradation predates today's ORACLE update by several months.

This is confirmed technical evidence.

---

# 18. Round 3 Decisions

## A — Isolate S7

```text
grid         +10
safety        +4
economy      -12
trust         -2
cascadeRisk  -18
```

## B — Redistribute Through ORACLE

```text
grid          +5
safety        +2
economy       -3
trust         +1
cascadeRisk   +8
```

## C — Keep S7 Online

```text
grid          -8
safety        -6
economy       +4
trust          0
cascadeRisk  +18
```

---

# 19. Round 4 — THE LEAK

## Public Event

**MEDIA REPORTS QUESTION HELIX**

Narrative:

> Reports are emerging that infrastructure warnings may have existed before today's crisis.

## Journalist Evidence

If the March report has not been formally shared, Lena receives partial evidence from her anonymous source.

Status:

```text
UNVERIFIED
```

If the actual March report has already been shared:

```text
CONFIRMED
```

---

# 20. BREAKING LEAK

Lena may use her ability.

## Publishing Confirmed Evidence

Effects:

```text
trust          +7
economy        -5
helixExposed   true
```

Broadcast:

> BREAKING — Helix Energy knew critical infrastructure was at risk months before today's emergency.

## Publishing Unverified Evidence

Effects:

```text
trust          -8
economy        -3
helixExposed   false
```

Broadcast:

> Helix denies an unverified report alleging prior knowledge of infrastructure problems.

---

# 21. ORACLE Deployment Log

During Round 4, the Engineer may receive:

**ORACLE DEPLOYMENT LOG**

```text
BUILD:
7.4

DEPLOYED:
06 HOURS BEFORE INCIDENT

LOAD TEST:
INCOMPLETE

AUTHORIZED BY:
DR. MAYA CHEN
```

This initially remains private.

Maya may share it.

---

# 22. Failure Correlation Analysis

If sufficient investigation/evidence conditions are satisfied, players unlock:

**FAILURE CORRELATION ANALYSIS**

```text
ORACLE BUILD 7.4
        +
PRE-EXISTING S7 DEGRADATION
        ↓
LOAD REDISTRIBUTION
        ↓
THERMAL OVERLOAD
        ↓
TRANSFORMER FAILURE
```

Status:

```text
CONFIRMED
```

Unlocking this evidence sets:

```text
trueCauseDiscovered = true
```

Canonical conclusion:

> Neither the AI update nor infrastructure neglect alone caused the disaster. Their interaction did.

---

# 23. Round 4 Decisions

## A — Publicly Disclose Known Evidence

Primary impact:

```text
economy -4
```

Trust effect depends on evidence quality and should be deterministic.

## B — Suppress Information Until Crisis Ends

Immediate:

```text
trust   +1
economy +2
```

If suppression is later exposed:

```text
trust -12
```

## C — Independent Investigation

```text
trust   +4
economy -2
```

May contribute toward unlocking Failure Correlation Analysis.

---

# 24. Round 5 — SYSTEM FAILURE

## Public Event

**CRITICAL INFRASTRUCTURE FAILURE**

Multiple sectors destabilize simultaneously.

Suggested map state:

```text
NORTH        WARNING
CENTRAL      CRITICAL
MEDICAL      CRITICAL
INDUSTRIAL   WARNING
TRANSIT      OFFLINE
SECTOR 7     CRITICAL
```

## Base Effects

```text
grid         -10
safety        -7
economy       -6
trust         -4
cascadeRisk  +10
```

Previous decisions may modify severity.

---

# 25. Round 5 NPC Messages

## St. Anne's Hospital

**Dr. Priya Shah**

> We're losing backup systems. I need to know whether power is coming back.

## Emergency Services

**Chief Ramirez**

> Traffic systems are down across three districts.

## ORACLE

ORACLE reports the current estimated cascade risk.

Example:

> Projected probability of uncontrolled cascade: 78%.

The displayed percentage should use the actual current game state where appropriate.

---

# 26. REDLINE Protocol

After Round 5:

```text
UNCONTROLLED CASCADE IMMINENT

STANDARD RESPONSE OPTIONS EXHAUSTED

REDLINE PROTOCOL AVAILABLE
```

The game enters its final decision.

---

# 27. REDLINE Option A — TOTAL GRID SHUTDOWN

Description:

> Shut down the entire Novus grid and restart sectors manually.

Effects:

```text
grid         +20
safety        -8
economy      -18
trust         -5
cascadeRisk  -40
```

---

# 28. REDLINE Option B — TRUST ORACLE

Description:

> Allow ORACLE Build 7.4 to autonomously rebalance the grid.

If S7 has previously been isolated:

```text
grid         +18
safety        +8
economy       +5
trust         +4
cascadeRisk  -25
```

If S7 remains active:

```text
grid         -20
safety       -15
economy      -10
trust        -10
cascadeRisk  +30
```

Previous player decisions therefore materially affect the final outcome.

---

# 29. REDLINE Option C — MANUAL TAKEOVER

Description:

> Engineers manually redistribute power while emergency services prioritize critical infrastructure.

Effects:

```text
grid          +8
safety       +14
economy       -8
trust         +6
cascadeRisk  -18
```

---

# 30. Final Vote

The REDLINE decision requires:

```text
3 of 4 approvals
```

Standard timer:

**30 seconds**

Demo timer:

**15 seconds**

If no option obtains three approvals:

**REDLINE DEADLOCK**

Effect:

```text
cascadeRisk +25
```

The ending is then calculated normally.

---

# 31. Normal Proposal Voting

Normal proposals require:

```text
3+ APPROVE → PASS
2 APPROVE / 2 REJECT → FAIL
0–1 APPROVE → FAIL
```

There is no abstain button.

A disconnected player who does not return before timeout produces:

```text
NO VOTE
```

The proposal still requires three approvals.

---

# 32. Proposal System

Any player may create a proposal.

A proposal contains:

```text
title
action
reason
```

A player may have at most one active proposal at a time.

Example:

```text
REROUTE INDUSTRIAL POWER

Redirect District 4 power to St. Anne's Hospital.

Reason:
Civilian lives outweigh contractual penalties.
```

---

# 33. Custom Actions

Players may create custom actions.

AI may classify custom actions into:

```text
power_reroute
shutdown
investigate
public_disclosure
emergency_response
economic_protection
grid_stabilization
other
```

AI may recommend consequences.

The deterministic server validates and clamps them.

For normal public metric changes:

```text
-15 <= delta <= +15
```

For Cascade Risk:

```text
-20 <= delta <= +20
```

AI recommendations never directly mutate authoritative game state.

---

# 34. Ending Priority

Catastrophic endings are evaluated before positive endings.

## CATASTROPHIC CASCADE

Condition:

```text
cascadeRisk >= 100
```

Narrative:

> Cascading transformer failures overwhelm the Novus electrical grid.

## GRID COLLAPSE

Condition:

```text
grid < 35
```

Narrative:

> Novus City's electrical network collapses.

## PYRRHIC VICTORY

Condition:

```text
grid >= 35
AND
safety >= 40
```

Narrative:

> Novus survives, but at enormous economic and human cost.

## CITY SAVED

Condition:

```text
grid >= 55
AND
safety >= 60
AND
cascadeRisk < 70
```

Narrative:

> The grid survives. Recovery will take weeks.

## MIRACLE RECOVERY

Condition:

```text
grid >= 70
AND
safety >= 75
AND
cascadeRisk <= 30
```

Narrative:

> Novus City stabilizes with limited loss of life.

More specific positive endings should take precedence over less specific positive endings.

---

# 35. Special Achievement — THE TRUTH EXPOSED

This is an overlay achievement rather than the main city ending.

Condition:

```text
trueCauseDiscovered === true
```

and confirmed wrongdoing evidence was made public.

---

# 36. Team Score

Final score range:

```text
0–10,000
```

Weights:

```text
Grid Stability       20%
Civilian Safety      25%
Economic Stability   15%
Public Trust         15%
Collaboration        25%
```

---

# 37. Collaboration Score

Initial value:

```text
50
```

Maximum:

```text
100
```

Reward meaningful collaboration such as:

- unique intelligence formally shared;
- vote participation;
- confirmed evidence shared;
- successful proposals from different players;
- appropriate role ability usage.

Do not reward raw chat-message volume.

Do not allow message spam to increase Collaboration Score.

---

# 38. Score Grades

```text
9000–10000  S
8000–8999   A
7000–7999   B
6000–6999   C
4000–5999   D
<4000       F
```

---

# 39. Awards

Possible awards include:

## INTELLIGENCE OFFICER

Most useful evidence discovered/shared.

## COMMANDER

Most successful proposals.

## DIPLOMAT

Highest collaboration contribution.

## VAULT

Kept the most intelligence private.

## WHISTLEBLOWER

Published critical evidence.

## CHAOS AGENT

Actions correlated with greatest damage.

## ORACLE

Strong technical decision-making.

Only approximately three or four awards should appear after a game.

---

# 40. Secret Reveal

Secrets are revealed one player at a time after the game.

Example Executive reveal:

```text
CLASSIFIED FILE #03

MARCUS VALE
HELIX ENERGY

YOU KNEW.

Three months before the crisis,
Marcus received a report recommending
immediate replacement of S7.

HE DELAYED IT.
```

Then display objective success/failure.

Example Engineer reveal:

```text
CLASSIFIED FILE #01

DR. MAYA CHEN

Six hours before the crisis,
Maya authorized ORACLE Build 7.4
without complete load testing.
```

---

# 41. Final Truth Screen

After secret reveals:

```text
WHAT ACTUALLY HAPPENED?

S7 DEGRADATION
      +
DELAYED MAINTENANCE
      +
ORACLE BUILD 7.4
      ↓
AGGRESSIVE LOAD REDISTRIBUTION
      ↓
THERMAL OVERLOAD
      ↓
CASCADE
```

Final statement:

> **The crisis had no single cause.**

---

# 42. Timeline

The final timeline must be generated from actual deterministic game event records.

It must not be fabricated by the LLM.

Example:

```text
00:00  ORACLE detected instability.
00:47  Maya shared optimization data.
01:21  Team maintained normal operations.
02:04  St. Anne's lost primary power.
02:41  Industrial power rerouted.
03:22  S7 entered critical state.
03:58  Marcus discovered March report.
04:13  Marcus kept report classified.
04:44  Lena obtained leaked evidence.
05:02  Lena published the report.
05:51  Helix publicly implicated.
07:31  REDLINE Protocol activated.
08:02  Manual takeover approved.
08:39  Grid stabilized.
```

---

# 43. AI Responsibilities

AI may be used for:

- cinematic narrative;
- emergency broadcasts;
- NPC message wording;
- custom action classification;
- custom-action consequence recommendations;
- explanations of deterministic consequences;
- limited narrative variation.

---

# 44. AI Prohibitions

AI must never:

- reveal unshared player secrets;
- change canonical truth;
- invent new player secrets;
- decide player votes;
- change voting rules;
- change game rules;
- determine authoritative scores;
- directly mutate game state;
- determine authoritative endings;
- contradict confirmed evidence;
- bypass metric bounds;
- bypass action-effect clamps.

The deterministic game engine is always authoritative.

---

# 45. AI Tone

The Game Master must not sound like a friendly chatbot.

Avoid language such as:

```text
Great job!
Nice choice!
What would you like to do next?
```

Preferred tone:

- clinical;
- urgent;
- concise;
- cinematic;
- neutral.

Example:

```text
NOVUS EMERGENCY NETWORK

Industrial power has been rerouted toward
St. Anne's Medical District.

Manufacturing systems across District 4
are shutting down.
```

---

# 46. AI Failure Requirement

REDLINE must remain completely playable when the AI provider is unavailable.

Fallback content must exist for all canonical events.

If AI fails:

```text
gameplay       WORKS
voting         WORKS
events         WORK
private intel  WORKS
metrics        WORK
abilities      WORK
ending         WORKS
scoring        WORKS
```

Only dynamic narrative quality should degrade.

---

# 47. Communication

Players have access to a shared command channel.

Example:

```text
[MAYA]
We need to isolate S7.

[MARCUS]
That could cripple industrial output.

[LENA]
Why are you so worried about S7?

[ELENA]
Hospital comes first.
```

System events appear separately.

Example:

```text
SYSTEM
Lena shared classified intelligence.
```

---

# 48. Reactions

Supported quick reactions:

```text
👍
👎
⚠️
🤔
🚨
💀
```

Reactions are primarily social feedback.

They must not materially modify game state.

---

# 49. City Map

The map is fictional.

Do not integrate an external mapping provider.

Required sectors:

- North
- West
- Central
- Industrial
- Medical
- Sector 7

Transit may be represented through network connections.

Suggested topology:

```text
             NORTH
               ●
              / \
             /   \
          WEST---CENTRAL
           ●        ●
           |       / \
           |      /   \
      INDUSTRIAL ● --- ● MEDICAL
               \
                \
                 ●
              SECTOR 7
```

---

# 50. Sector States

Each sector may have:

```text
stable
warning
critical
offline
```

Sector state must have both visual color and textual/icon indication.

---

# 51. Main Command Center

The desktop command-center layout contains:

## Header

- REDLINE branding;
- scenario;
- round;
- timer;
- sound control.

## Left Panel

Public city metrics.

## Center

Animated Novus City electrical-grid visualization.

## Right Panel

Live intelligence and event feed.

## Bottom Area

- private intelligence;
- command/proposal controls;
- evidence access.

## Persistent Player Area

Shows:

- player;
- role;
- connection state;
- current activity where appropriate.

---

# 52. Presence States

Possible states include:

```text
online
disconnected
voting
typing
```

Presence should make the room visibly feel multiplayer.

---

# 53. Critical Event Presentation

Major events temporarily interrupt normal UI.

Sequence:

1. background darkens;
2. alert sound;
3. emergency border/visual treatment;
4. event headline;
5. immediate metric impact;
6. overlay collapses into event history.

Example:

```text
CRITICAL EVENT

ST. ANNE'S HOSPITAL

PRIMARY POWER LOST

SAFETY ▼ 5
```

---

# 54. Voting Presentation

Voting temporarily receives strong visual priority.

Example:

```text
DECISION REQUIRED

SHUT DOWN SECTOR 7

PROPOSED BY MAYA

00:17

[ APPROVE ]    [ REJECT ]

MAYA      APPROVED
ELENA     APPROVED
MARCUS    REJECTED
LENA      ...
```

After resolution:

```text
3 APPROVE
1 REJECT

DECISION AUTHORIZED
```

or:

```text
DECISION REJECTED
```

---

# 55. Metric Animation

Metric changes should animate rather than instantly jump.

Example:

```text
72
69
64
59
54
```

Then display the delta:

```text
GRID STABILITY

54%

▼ -18
```

---

# 56. Visual Direction

REDLINE must not look like:

- a generic SaaS dashboard;
- a ChatGPT clone;
- a default component-library application.

Desired feeling:

> **An emergency command center the player was not supposed to have access to.**

Visual references should conceptually combine:

- futuristic emergency operations;
- military command interfaces;
- technical monitoring systems;
- cinematic science-fiction thrillers.

Use restrained effects.

Most of the interface should remain dark and muted.

Strong colors indicate important information.

---

# 57. Visual Palette

Recommended foundation:

Background:

```text
#050709
```

Panel:

```text
#0B1015
```

Semantic accents:

- emergency: red;
- technical/electrical: cyan;
- warning: amber;
- success: green.

Role identity:

- Engineer: electric cyan;
- Mayor: gold;
- Executive: purple;
- Journalist: orange.

Role colors should be used sparingly.

---

# 58. Typography

Use two visual categories.

## Interface Typography

Clean modern sans-serif.

## Technical/Data Typography

Monospace.

Examples:

```text
REDLINE

GRID STABILITY

72%

SECTOR_07
```

---

# 59. Animation

Most interface animations:

```text
150–400ms
```

Critical overlays:

```text
2–4 seconds
```

Allowed ambient effects:

- subtle map pulse;
- scanning line;
- minor data flicker;
- flowing electrical connections.

Avoid excessive constant animation.

---

# 60. Sound

Required sound categories:

- intelligence received;
- proposal created;
- voting begins;
- vote submitted;
- proposal approved;
- proposal rejected;
- critical event;
- sector offline;
- victory;
- collapse.

Sound must have a persistent mute toggle.

Do not produce uncontrolled autoplay before user interaction.

---

# 61. Lobby

Lobby must display:

```text
REDLINE

CRISIS ROOM

7XK9

OPERATORS

MAYA      READY
ELENA     READY
MARCUS    READY
LENA      READY

MODE

STANDARD
DEMO

[ COPY INVITE ]

[ INITIATE CRISIS ]
```

Only the host controls game mode.

---

# 62. Role Reveal

Sequence:

```text
IDENTITY AUTHENTICATION
        ↓
ACCESS GRANTED
        ↓
ROLE
        ↓
PUBLIC RESPONSIBILITY
        ↓
CLASSIFIED SECRET
        ↓
OBJECTIVE
        ↓
ABILITY
```

Each player must acknowledge the briefing.

---

# 63. Mission Intro

All players receive:

```text
NOVUS CITY — 2042

3.2 million residents.

One autonomous electrical grid.

Something is going wrong.
```

Then:

```text
ORACLE EMERGENCY STATE

GRID STABILITY
72%

CASCADE RISK
UNKNOWN
```

---

# 64. Results Sequence

Results must be presented in this order:

```text
1. CRISIS TERMINATED
2. CITY OUTCOME
3. FINAL METRICS
4. TEAM SCORE
5. PERSONAL OBJECTIVES
6. AWARDS
7. SECRET REVEAL
8. THE TRUTH
9. TIMELINE
```

Do not dump all results onto one screen simultaneously.

---

# 65. Required Major Screens

The application must support these experiences:

```text
01 Landing
02 Create / Join
03 Lobby
04 Role Reveal
05 Mission Intro
06 Crisis Command Center
07 Voting Overlay
08 Critical Event Overlay
09 REDLINE Final Decision
10 Outcome
11 Score
12 Secret Reveal
13 Truth
14 Timeline
```

These experiences may share routes where architecturally appropriate.

---

# 66. Landing Page

Required content:

```text
R E D L I N E

NOBODY HAS THE WHOLE TRUTH.

A MULTIPLAYER AI CRISIS SIMULATION

[ CREATE CRISIS ROOM ]

[ JOIN ROOM ]

4 OPERATORS
1 CITY
12 MINUTES
```

A subtle fictional electrical-grid visualization may animate behind the hero.

---

# 67. Demo Mode Guarantees

Demo Mode must guarantee that the following beats can occur:

- S7 instability;
- St. Anne's emergency;
- March inspection report;
- ORACLE deployment evidence;
- Helix conflict;
- final REDLINE decision;
- secret reveal.

Random narrative variation must never prevent these moments.

---

# 68. Demo Reset

Development/demo tooling must provide a way to reset the demo.

Reset must restore:

- initial metrics;
- initial Cascade Risk;
- round;
- phase;
- abilities;
- evidence;
- private intel;
- proposals;
- votes;
- event history;
- scenario flags.

This feature may be hidden from normal production players.

---

# 69. Deterministic Authority

The game engine is authoritative for:

- current phase;
- current round;
- metrics;
- Cascade Risk;
- votes;
- proposal outcomes;
- role abilities;
- evidence state;
- canonical scenario progression;
- personal objectives;
- team score;
- ending selection;
- timeline.

AI is subordinate to the deterministic engine.

If AI output conflicts with game-engine state:

> **The game engine wins.**

---

# 70. Multiplayer Authority

Clients must not directly authoritatively mutate:

- Grid Stability;
- Civilian Safety;
- Economic Stability;
- Public Trust;
- Cascade Risk;
- round;
- phase;
- ending;
- scores.

Clients submit intentions/actions.

Authoritative server-side logic validates and applies them.

---

# 71. Private Information Requirement

Private intelligence must not be sent to unauthorized clients.

Do not fetch all private information and merely hide it with frontend logic.

Private intel must be protected at the data-access layer.

---

# 72. Concurrency Requirement

Game-state mutations must protect against duplicate resolution and concurrent writes.

Important operations such as:

- vote resolution;
- phase transition;
- round advancement;
- ability use;
- final decision resolution

must be idempotent or concurrency-safe.

---

# 73. Player Identity

Full account creation is not required.

Players may use lightweight session identity.

Required player-facing identity:

**Callsign / display name**

The implementation may use a locally persisted anonymous player identifier.

---

# 74. Room Requirements

Players can:

- create a crisis room;
- receive a short room code;
- copy an invite;
- join using room code/link;
- choose a callsign;
- mark themselves ready.

A normal match begins with four players.

---

# 75. Demo/Development Safety

Development may include simulated players or helper controls so the game can be tested without four physical people.

These controls must not interfere with normal gameplay.

---

# 76. Replayability

Hackathon-version replayability should come from:

- human decisions;
- private information;
- disclosure choices;
- custom proposals;
- role objectives;
- AI narrative variation;
- branching deterministic consequences.

Do not implement procedural scenario generation.

---

# 77. Accessibility Minimums

The game should:

- not communicate state using color alone;
- use labels/icons for sector status;
- provide visible focus states;
- support keyboard-accessible voting;
- maintain readable contrast;
- provide sound mute controls.

---

# 78. Platform Priority

Desktop is the primary target.

The application should remain reasonably usable on smaller screens, but mobile perfection is not a hackathon priority.

---

# 79. Explicitly Out of Scope

Do not implement the following unless the specification is explicitly changed:

- user accounts;
- OAuth;
- friends;
- public matchmaking;
- leaderboards;
- multiple crisis scenarios;
- inventory systems;
- persistent achievement systems;
- voice chat;
- AI-generated maps;
- 3D environments;
- native mobile applications;
- payments;
- player profile customization;
- spectator mode;
- persistent progression;
- complex autonomous NPC agents.

---

# 80. Critical Demo Moments

If development time becomes constrained, preserve these three experiences above all optional polish.

## Moment 1 — Different Secrets

Different players receive materially different private information.

## Moment 2 — Shared Consequence

Players vote and immediately see the shared city react.

## Moment 3 — Secret Reveal

Players discover why teammates behaved differently.

These moments communicate REDLINE's multiplayer value.

---

# 81. Product Acceptance Test

REDLINE is considered functionally successful when four players can independently:

1. open the application;
2. join the same room;
3. choose callsigns;
4. become ready;
5. receive unique roles;
6. receive different secrets;
7. enter the crisis;
8. receive private intelligence;
9. communicate;
10. selectively share intelligence;
11. use role abilities;
12. create proposals;
13. vote;
14. see decisions resolve exactly once;
15. see shared metrics change;
16. progress through five rounds;
17. make the REDLINE decision;
18. receive a deterministic ending;
19. see team/personal results;
20. discover other players' secrets;
21. see the canonical root cause;
22. review the actual game timeline.

The game must complete this flow without requiring a developer to manually repair state.

---

# 82. Emotional Acceptance Test

The desired player experience should naturally generate reactions similar to:

> "Wait — what information did you get?"

> "Why don't you want us shutting down S7?"

> "I have something, but I don't know if I should share it."

> "Vote yes!"

> "YOU KNEW ABOUT THE INSPECTION?!"

If those interactions emerge naturally, the asymmetric multiplayer design is working.

---

# 83. Architecture Boundary

REDLINE consists conceptually of three layers:

```text
┌──────────────────────────────┐
│        PRESENTATION          │
│                              │
│ UI / animation / audio       │
├──────────────────────────────┤
│        GAME MASTER           │
│                              │
│ AI narrative / action        │
│ classification               │
├──────────────────────────────┤
│        GAME ENGINE           │
│                              │
│ State / truth / rules /      │
│ metrics / votes / endings    │
└──────────────────────────────┘
```

Authority flows downward.

The Game Engine is authoritative.

---

# 84. Required Development Order

Implementation should proceed approximately in this order:

```text
01  Repository foundation
02  Domain types
03  BLACKOUT scenario data
04  Deterministic game engine
05  Engine tests
06  Supabase schema + RLS
07  Room creation/join
08  Lobby + presence
09  Role assignment
10  Private intelligence
11  Crisis shell
12  Realtime game state
13  Round progression
14  Proposals
15  Voting
16  Decision consequences
17  Role abilities
18  Evidence
19  Chat + reactions
20  AI Game Master
21  Custom action classification
22  AI fallbacks
23  Novus SVG map
24  Event presentation
25  Full visual polish
26  Sound
27  Final REDLINE decision
28  Results/scoring
29  Secret reveal
30  Timeline
31  Demo mode
32  Reconnect/concurrency hardening
33  End-to-end testing
34  Production build
35  Demo rehearsal
```

Do not skip directly to visual polish before the multiplayer gameplay loop works.

---

# 85. Development Rule

Each development prompt should implement only its requested milestone.

After each milestone:

1. run type checking;
2. run linting;
3. run relevant tests;
4. run the production build when appropriate;
5. fix failures introduced by the milestone;
6. report files created;
7. report files modified;
8. report tests performed;
9. report known issues;
10. stop before implementing the next milestone.

---

# 86. Final Authority Statement

This specification is the canonical product definition for REDLINE v1.0.

The following are frozen:

- scenario;
- canonical truth;
- four roles;
- character identities;
- secrets;
- personal objectives;
- abilities;
- starting metrics;
- hidden Cascade Risk;
- five-round structure;
- canonical evidence;
- suggested decisions;
- deterministic decision effects;
- REDLINE final decision;
- ending logic;
- scoring model;
- results sequence;
- AI authority boundaries;
- multiplayer principles;
- major UI experiences;
- hackathon scope.

When ambiguity exists, choose the implementation that:

1. preserves deterministic game authority;
2. protects private information;
3. strengthens real-time multiplayer interaction;
4. preserves the canonical story;
5. minimizes hackathon implementation risk;
6. does not expand scope unnecessarily.

**END OF REDLINE MASTER PRODUCT SPECIFICATION v1.0**

# 87. IMPLEMENTATION CLARIFICATIONS v1.1

**Status:** FROZEN  
**Purpose:** Resolve implementation ambiguities identified during Prompt 00.

The rules in this section are authoritative.

If an earlier section conflicts with Section 87, **Section 87 takes precedence**.

---

## 87.1 Canonical Round Lifecycle

Rounds 1–4 each produce exactly **one authoritative team decision**.

The lifecycle is:

```text id="4op1qe"
ROUND EVENT
    ↓
PRIVATE INTELLIGENCE
    ↓
DISCUSSION
    ↓
PROPOSAL / RESPONSE SELECTION
    ↓
VOTING
    ↓
RESOLUTION
    ↓
CONSEQUENCES
    ↓
ROUND COMPLETE
    ↓
NEXT ROUND
```

Players may communicate, investigate, use eligible abilities, share intelligence, and create proposals during the discussion phase.

Only one proposal or canonical response is ultimately voted upon for the round.

After that vote resolves, the round proceeds to consequences and completion.

A round does not contain multiple sequential team votes.

---

## 87.2 Proposal Selection

Each player may create at most one active proposal during the discussion phase.

Multiple players may therefore have proposals simultaneously.

Before voting begins, one proposal must become the:

```text id="cuxo07"
SELECTED_PROPOSAL
```

The room host may select an eligible proposal for voting.

The Mayor may use **EMERGENCY ORDER** to immediately select an eligible proposal and begin voting.

Once voting begins:

- proposal selection is locked;
- new proposals cannot replace the selected proposal;
- the selected proposal becomes the only proposal voted upon for that round.

Unselected proposals expire when the round ends.

---

## 87.3 Canonical Suggested Responses

Rounds 1–4 provide three canonical suggested responses defined by this specification.

These responses are always available even if players create no custom proposals.

A canonical suggested response behaves like a proposal for voting purposes.

Players may therefore choose between:

- a player-created proposal; or
- one of the round's canonical suggested responses.

---

## 87.4 Discussion Timeout

If discussion time expires and no proposal has entered voting, the system enters:

```text id="cnf45c"
RESPONSE_SELECTION
```

The canonical responses for the current round are presented.

The host receives a short selection window.

### Standard Mode

```text id="b46b4b"
10 seconds
```

### Demo Mode

```text id="rvkzkr"
5 seconds
```

If the host makes a selection, that response immediately enters voting.

If the host does not select before the selection timer expires, the system automatically selects the round's designated default response.

Canonical defaults are:

```text id="csfgc7"
Round 1 → Investigate Before Acting

Round 2 → Emergency Generators Only

Round 3 → Redistribute Through ORACLE

Round 4 → Independent Investigation
```

This guarantees deterministic progression.

---

## 87.5 Failed Vote / Inaction

If a normal proposal fails to obtain three approvals:

```text id="mvgtw6"
DECISION REJECTED
```

The proposed action is not executed.

The round still advances.

A deterministic **inaction consequence** is applied.

### Round 1

```text id="23fv1c"
grid         -2
cascadeRisk  +6
```

### Round 2

```text id="1v2y40"
safety       -4
trust        -2
cascadeRisk  +4
```

### Round 3

```text id="48ntse"
grid         -5
safety       -3
cascadeRisk +10
```

### Round 4

```text id="2cldt7"
trust        -3
```

All metric bounds remain enforced.

The rejected proposal and inaction consequence must be recorded in the timeline.

---

## 87.6 Round 5 Flow

Round 5 intentionally does **not** contain a normal proposal vote.

Its lifecycle is:

```text id="sh2y51"
SYSTEM FAILURE EVENT
        ↓
ROUND 5 BASE EFFECTS
        ↓
PRIVATE / NPC INTELLIGENCE
        ↓
SHORT DISCUSSION
        ↓
REDLINE PROTOCOL ACTIVATED
        ↓
FINAL REDLINE VOTE
```

Players may still:

- communicate;
- inspect existing evidence;
- formally share eligible private intelligence;
- use any still-eligible informational role ability where allowed.

Players do not create a normal Round 5 team proposal.

The REDLINE Protocol is the authoritative team decision for Round 5/final resolution.

---

# 87.7 Final REDLINE Ballot

The final REDLINE decision uses a **single-choice ballot**.

Each eligible player chooses exactly one:

```text id="3ikxoz"
A — TOTAL GRID SHUTDOWN

B — TRUST ORACLE

C — MANUAL TAKEOVER
```

A player may change their selection while the final voting timer is active.

Only the player's latest selection counts.

A REDLINE option immediately becomes authorized when it reaches:

```text id="uk4s37"
3 votes
```

Because there are exactly four players and each player has only one active selection, only one option can reach three votes.

Once an option reaches three votes:

- voting locks;
- the winning option becomes authoritative;
- its effects execute exactly once;
- remaining timer time is ignored.

If the timer expires without any option reaching three votes:

```text id="i5p3bx"
REDLINE DEADLOCK
```

Apply:

```text id="9q42w7"
cascadeRisk +25
```

Then calculate the final ending.

Disconnected players who fail to vote before expiration contribute no selection.

---

# 87.8 Evidence Model

Evidence uses **two independent dimensions**.

Do not represent privacy and verification as one enum.

## Visibility

```text id="ijcqgu"
private
shared
public
```

### private

Visible only to the authorized player.

### shared

Formally disclosed to the crisis room.

Visible to all players.

### public

Published outside the crisis room.

May affect Public Trust, Economy, Helix exposure, objectives, or achievements.

---

## Verification

```text id="4i84ev"
unverified
confirmed
contradicted
```

### unverified

The information exists but has not been sufficiently established.

### confirmed

The evidence is considered reliable within the canonical scenario.

### contradicted

The evidence has been refuted by confirmed evidence.

---

An evidence item therefore contains both dimensions.

Example:

```text id="dy2j84"
March Inspection Report

visibility = private
verification = confirmed
```

This means Marcus privately possesses a genuine confirmed report.

Another example:

```text id="m5oc8j"
Anonymous Partial Report

visibility = private
verification = unverified
```

---

# 87.9 Sharing Evidence

Formal sharing changes:

```text id="d25r2x"
visibility:
private → shared
```

It does not automatically change verification.

For example:

```text id="0jy55r"
private + unverified
        ↓ SHARE
shared + unverified
```

or:

```text id="d1aex3"
private + confirmed
        ↓ SHARE
shared + confirmed
```

Formal sharing is irreversible.

Once evidence becomes:

```text id="lx76i5"
shared
```

or:

```text id="j0vt5w"
public
```

it can never return to `private`.

---

# 87.10 Public Disclosure

Public disclosure changes:

```text id="76ugdc"
visibility → public
```

Public disclosure is distinct from sharing evidence with the crisis room.

Public disclosure may occur through:

1. Lena's **BREAKING LEAK** ability; or
2. the Round 4 canonical **Publicly Disclose Known Evidence** response.

Only evidence currently known to the room or legitimately possessed by the publishing player may be published.

The game must never allow publication of evidence the acting player has not obtained.

---

# 87.11 Canonical Evidence Discovery

The following discovery rules are deterministic.

## ORACLE Build 7.4 Deployment Log

Initial owner:

```text id="tob5d5"
Maya
```

Automatically delivered during:

```text id="xevx1p"
Round 4
```

State:

```text id="mgq6rv"
visibility = private
verification = confirmed
```

---

## March Inspection Report

Initial owner:

```text id="c6t12l"
Marcus
```

Unlocked when Marcus uses:

```text id="wpw3so"
CORPORATE INTEL
```

during Round 3 or later.

State:

```text id="8a6sh6"
visibility = private
verification = confirmed
```

---

## Transformer Degradation Analysis

Initial owner:

```text id="7cv46q"
Maya
```

Unlocked when Maya uses:

```text id="h3zkbs"
DIAGNOSTIC SCAN
```

on Sector 7 during Round 3 or later.

State:

```text id="i0twdv"
visibility = private
verification = confirmed
```

---

## Anonymous S7 Warning

Initial owner:

```text id="5r5oy7"
Lena
```

Available from early scenario intelligence.

Initial state:

```text id="g12xw2"
visibility = private
verification = unverified
```

---

## Anonymous Partial March Report

During Round 4, if the confirmed March Inspection Report has **not already been shared**, Lena automatically receives a partial leaked copy.

State:

```text id="0dvz4j"
visibility = private
verification = unverified
```

If the confirmed March Inspection Report is already shared, this additional partial report is unnecessary and does not need to be created.

---

## Hospital Impact Report

Initial owner:

```text id="1xj8e5"
Elena
```

Delivered during Round 2.

State:

```text id="u85g6s"
visibility = private
verification = confirmed
```

---

# 87.12 Failure Correlation Analysis Unlock

The canonical **Failure Correlation Analysis** may be unlocked through either of two deterministic paths.

## Path A — Evidence Combination

Unlock when both of the following have been formally shared:

```text id="mllv5s"
Transformer Degradation Analysis
verification = confirmed

AND

ORACLE Build 7.4 Deployment Log
verification = confirmed
```

Both must have:

```text id="ttr2au"
visibility = shared OR public
```

---

## Path B — Independent Investigation

If the Round 4 team successfully approves:

```text id="l9ld27"
INDEPENDENT INVESTIGATION
```

and at least one of these is confirmed and shared/public:

```text id="atc7cd"
Transformer Degradation Analysis

OR

ORACLE Build 7.4 Deployment Log

OR

March Inspection Report
```

then the investigation unlocks Failure Correlation Analysis.

---

When unlocked:

```text id="l6am9u"
Failure Correlation Analysis

visibility = shared
verification = confirmed
```

and:

```text id="mxxcl5"
trueCauseDiscovered = true
```

This operation must occur at most once.

---

# 87.13 Round 2 Severity

Round 2 hospital severity is determined using Cascade Risk **immediately before the Round 2 event is applied**.

## LOW

Condition:

```text id="xbcl5m"
cascadeRisk <= 39
```

Narrative:

> Grid instability has forced St. Anne's Hospital onto backup power.

Effects:

```text id="s3ywhi"
safety -5
trust  -2
```

---

## MEDIUM

Condition:

```text id="4s85dc"
40 <= cascadeRisk <= 69
```

Narrative:

> A transformer failure has disconnected St. Anne's Hospital from the primary grid.

Effects:

```text id="pk89n7"
safety -7
trust  -3
```

---

## HIGH

Condition:

```text id="pb18yz"
cascadeRisk >= 70
```

Narrative:

> St. Anne's has lost primary power and backup-generation stability is deteriorating.

Effects:

```text id="lsf7qf"
safety -10
trust  -5
```

These replace the earlier generic Round 2 base effects.

Do not apply both the base effect and severity effect.

---

# 87.14 Round 5 Severity

Round 5 base effects are:

```text id="pdg76n"
grid         -10
safety        -7
economy       -6
trust         -4
cascadeRisk  +10
```

Determine severity using Cascade Risk immediately before applying the event.

## Contained

```text id="8kytdc"
cascadeRisk < 50
```

Multiplier:

```text id="l1qvn6"
0.75
```

## Severe

```text id="2ykgnr"
50 <= cascadeRisk <= 74
```

Multiplier:

```text id="e0qbpa"
1.0
```

## Critical

```text id="0g2rsq"
cascadeRisk >= 75
```

Multiplier:

```text id="xgk0zp"
1.25
```

Multiply each Round 5 effect by the severity multiplier.

Round each resulting delta to the nearest integer.

Then clamp final metrics to their valid 0–100 range.

Example:

```text id="sgj0v5"
grid delta = -10 × 1.25
           = -12.5
           → -13
```

Use conventional half-away-from-zero rounding for `.5` values so negative and positive effects are treated symmetrically.

---

# 87.15 Round 4 Public Disclosure Effects

The Round 4 canonical action:

```text id="jq00fj"
PUBLICLY DISCLOSE KNOWN EVIDENCE
```

uses deterministic effects based on the strongest eligible evidence being disclosed.

## Confirmed Helix Wrongdoing Evidence

Example:

```text id="h1e33p"
March Inspection Report
```

Effects:

```text id="vif2zq"
trust          +7
economy        -5
helixExposed   true
```

---

## Confirmed Non-Helix Evidence

Example:

```text id="f2vylj"
ORACLE Deployment Log
```

Effects:

```text id="nhp7gk"
trust          +4
economy        -3
```

This does not independently set:

```text id="6hgt8f"
helixExposed
```

---

## Unverified Evidence

Effects:

```text id="pyjjmt"
trust          -8
economy        -3
```

No Helix exposure occurs solely from an unverified allegation.

---

If multiple evidence items are publicly disclosed together, apply **one disclosure consequence**, using the highest-priority category:

```text id="d7b9z3"
Confirmed Helix Wrongdoing
        ↓
Confirmed Non-Helix Evidence
        ↓
Unverified Evidence
```

Do not stack multiple copies of disclosure metric effects.

The evidence items themselves may all become public.

---

# 87.16 Suppression Exposure

If Round 4 successfully selects:

```text id="zq8bmd"
SUPPRESS INFORMATION UNTIL CRISIS ENDS
```

set:

```text id="2qbxk0"
informationSuppressed = true
```

Immediate effects:

```text id="dknwd4"
trust   +1
economy +2
```

If confirmed evidence that was available to the room at the time of suppression is later made public, set:

```text id="m1rrlc"
suppressionExposed = true
```

and apply once:

```text id="9ql5cw"
trust -12
```

This penalty may occur at most once.

---

# 87.17 Helix Exposure

Set:

```text id="v36b0m"
helixExposed = true
```

when confirmed evidence demonstrating that Helix knew about the dangerous S7 condition is publicly disclosed.

Canonical qualifying evidence:

```text id="b7rv95"
March Inspection Report
```

Unverified allegations do not set `helixExposed`.

Simply sharing evidence within the crisis room does not set `helixExposed`.

---

# 87.18 Lena Publication Bonus

Lena's bonus objective succeeds when she causes confirmed wrongdoing evidence to become:

```text id="dtt1lo"
visibility = public
```

The canonical qualifying evidence is the confirmed March Inspection Report.

This may occur through:

- BREAKING LEAK; or
- Lena initiating/participating in the successful canonical public-disclosure response where the confirmed report is published.

The implementation should track whether Lena was responsible for or directly participated in the publication action where needed for the bonus.

---

# 87.19 THE TRUTH EXPOSED

The special achievement requires:

```text id="w8qjd2"
trueCauseDiscovered === true
AND
confirmedWrongdoingPublished === true
```

Where `confirmedWrongdoingPublished` means confirmed evidence of Helix's prior knowledge has become public.

---

# 87.20 Humanitarian Disaster Ending

Add the following canonical ending.

## HUMANITARIAN DISASTER

Condition:

```text id="a3v9gg"
cascadeRisk < 100
AND
grid >= 35
AND
safety < 40
```

Narrative:

> The electrical grid survives, but emergency systems fail to protect thousands of Novus residents.

---

# 87.21 Ending Priority

Evaluate endings in this exact order:

```text id="yzf32k"
1. CATASTROPHIC CASCADE

2. GRID COLLAPSE

3. HUMANITARIAN DISASTER

4. MIRACLE RECOVERY

5. CITY SAVED

6. PYRRHIC VICTORY
```

Conditions:

## 1 — Catastrophic Cascade

```text id="i31d8h"
cascadeRisk >= 100
```

## 2 — Grid Collapse

```text id="pck5ex"
grid < 35
```

## 3 — Humanitarian Disaster

```text id="6ixx7h"
grid >= 35
AND
safety < 40
```

## 4 — Miracle Recovery

```text id="9v2vxm"
grid >= 70
AND
safety >= 75
AND
cascadeRisk <= 30
```

## 5 — City Saved

```text id="p87fcx"
grid >= 55
AND
safety >= 60
AND
cascadeRisk < 70
```

## 6 — Pyrrhic Victory

Fallback surviving-city ending when:

```text id="kr7kll"
grid >= 35
AND
safety >= 40
```

This ordering guarantees that every valid bounded final state receives an ending.

---

# 87.22 Custom Actions During AI Failure

Custom free-text actions depend on the AI classification layer.

If the AI provider:

- times out;
- is unavailable;
- returns invalid structured output;
- fails schema validation;
- violates game constraints;

then the custom action is **not executed**.

The UI should display:

```text id="tz84k9"
CUSTOM COMMAND ANALYSIS OFFLINE

Canonical response protocols remain available.
```

Players may continue using the current round's canonical suggested responses.

AI failure must therefore never block round progression.

Do not guess the meaning of arbitrary custom text when classification is unavailable.

---

# 87.23 Collaboration Score

Collaboration begins at:

```text id="1mkk5q"
50
```

Maximum:

```text id="l7fdr9"
100
```

The following events award collaboration points.

## Vote Participation

```text id="7o6bfk"
+2
```

Award once per player per authoritative team vote.

---

## Unique Intelligence Formally Shared

```text id="2a2p8q"
+3
```

Award once per unique evidence/intelligence item.

Repeated sharing cannot earn additional points.

---

## Confirmed Evidence Shared

Additional:

```text id="1e9vux"
+2
```

Therefore sharing a unique confirmed item may earn:

```text id="66tzba"
+5 total
```

---

## Successful Player-Created Proposal

```text id="6v11r9"
+3
```

Award to the proposal creator when their custom/player-created proposal passes.

Canonical suggested responses do not earn this creator bonus.

---

## Useful Role Ability

```text id="w5e5kn"
+3
```

Award when an ability successfully produces its intended game effect.

Each ability use may earn this once.

---

## Confirmed Wrongdoing Published

```text id="d3k3re"
+5
```

Award once globally when confirmed wrongdoing evidence is responsibly made public.

---

Collaboration rewards must be event-based and idempotent.

Chat volume and reaction volume never generate collaboration points.

Final Collaboration Score is clamped:

```text id="k5q4mx"
0 <= collaboration <= 100
```

---

# 87.24 Team Score Formula

Calculate:

```text id="9lhag5"
weightedScore =
    grid          * 0.20
  + safety        * 0.25
  + economy       * 0.15
  + trust         * 0.15
  + collaboration * 0.25
```

Then:

```text id="8n4d4i"
teamScore = round(weightedScore * 100)
```

Final range:

```text id="ezfvdq"
0–10,000
```

Example:

```text id="69frp6"
weightedScore = 84.52

teamScore = 8,452
```

Use standard nearest-integer rounding.

---

# 87.25 Personal Objectives

Canonical primary objectives are evaluated deterministically.

## Maya

```text id="5v0b5l"
grid >= 55
```

Her "avoid sole blame" bonus remains **narrative-only in REDLINE v1.0**.

Do not implement a separate blame scoring system.

---

## Elena

```text id="j7zbyz"
safety >= 70
AND
trust >= 50
```

---

## Marcus

```text id="0z1f2h"
economy >= 55
AND
helixExposed === false
```

---

## Lena

```text id="m6ow99"
trueCauseDiscovered === true
```

Bonus:

```text id="mqthod"
confirmed wrongdoing evidence became public
through a publication action attributed to Lena
```

---

# 87.26 Award Selection

Awards must use deterministic event counters/state.

Potential awards remain:

```text id="sm1jz0"
INTELLIGENCE OFFICER
COMMANDER
DIPLOMAT
VAULT
WHISTLEBLOWER
CHAOS AGENT
ORACLE
```

Display no more than:

```text id="5wr2cp"
4
```

awards.

Prefer awards with a clear unique winner.

If multiple players tie:

1. use earliest qualifying achievement timestamp where meaningful;
2. if a meaningful deterministic tie-break does not exist, omit that award rather than selecting randomly.

Do not use AI to select award winners.

---

# 87.27 Timeline Requirements

The timeline records authoritative events including:

- room/game start;
- round starts;
- important intelligence sharing;
- role ability usage;
- selected proposal;
- vote outcome;
- inaction consequence;
- canonical decision execution;
- public evidence disclosure;
- Helix exposure;
- suppression exposure;
- REDLINE activation;
- final vote;
- ending.

Timeline entries must come from actual game events.

AI may improve display wording later, but it must never fabricate timeline events.

---

# 87.28 Round Completion Guarantee

Every round must have a deterministic path to completion.

A match must never become permanently stuck because:

- nobody creates a proposal;
- the host does not select a proposal;
- a proposal fails;
- AI is unavailable;
- a custom action fails classification;
- a player disconnects;
- no REDLINE option initially has consensus.

Fallbacks defined in this section must allow progression.

---

# 87.29 Authority of Clarifications

Section 87 resolves the implementation ambiguities identified during specification review.

In particular, it defines:

- proposal selection;
- one-decision-per-round behavior;
- discussion timeout;
- failed-vote behavior;
- Round 5 flow;
- final REDLINE ballot semantics;
- evidence visibility;
- evidence verification;
- deterministic evidence discovery;
- Failure Correlation Analysis unlock;
- Round 2 severity;
- Round 5 severity;
- disclosure effects;
- suppression exposure;
- Helix exposure;
- Lena's publication bonus;
- THE TRUTH EXPOSED;
- complete ending coverage;
- AI failure handling for custom actions;
- Collaboration Score;
- Team Score;
- personal-objective evaluation;
- award tie handling;
- timeline requirements;
- round-completion guarantees.

Future implementation must follow these clarifications.

---

# 88. FINAL AUTHORITY STATEMENT

This specification is the canonical product definition for **REDLINE v1.1**.

The following are frozen:

- scenario;
- canonical truth;
- four roles;
- character identities;
- secrets;
- personal objectives;
- abilities;
- starting metrics;
- hidden Cascade Risk;
- five-round structure;
- round lifecycle;
- proposal selection;
- voting behavior;
- canonical evidence;
- evidence visibility and verification;
- deterministic evidence unlocks;
- canonical suggested decisions;
- deterministic decision effects;
- inaction consequences;
- REDLINE final ballot;
- ending logic;
- scoring model;
- collaboration scoring;
- results sequence;
- AI authority boundaries;
- multiplayer principles;
- major UI experiences;
- hackathon scope.

When ambiguity exists, choose the implementation that:

1. preserves deterministic game authority;
2. protects private information;
3. strengthens real-time multiplayer interaction;
4. preserves the canonical story;
5. guarantees forward game progression;
6. minimizes hackathon implementation risk;
7. does not expand scope unnecessarily.

If a future implementation decision would materially change gameplay, stop and request clarification rather than modifying the specification.

**END OF REDLINE MASTER PRODUCT SPECIFICATION v1.1**