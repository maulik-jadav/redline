import type { GameMode } from "@/types";
import { BLACKOUT_ABILITIES } from "./abilities";
import type { InitialScenarioState, ModeTiming, ScenarioMetadata } from "./config";
import { BLACKOUT_DISCLOSURE, BLACKOUT_PUBLICATION_RULES, BLACKOUT_SUPPRESSION_EXPOSURE } from "./disclosure";
import { BLACKOUT_ENDINGS } from "./endings";
import { BLACKOUT_EVIDENCE } from "./evidence";
import { BLACKOUT_FALLBACK_CONTENT } from "./fallback-content";
import { BLACKOUT_INITIAL_MAP, BLACKOUT_SECTORS } from "./map";
import { BLACKOUT_REDLINE } from "./redline";
import { BLACKOUT_ROLES } from "./roles";
import { BLACKOUT_ROUNDS } from "./rounds";
import { BLACKOUT_COLLABORATION, BLACKOUT_SCORING } from "./scoring";

export const BLACKOUT_METADATA = {
  id: "blackout", name: "BLACKOUT", location: "Novus City", year: 2042,
  population: 3200000, energyProvider: "Helix Energy", gridAi: "ORACLE", rounds: 5,
  tagline: "Nobody has the whole truth. Everyone has to make the decision.",
  framing: "Four people enter an emergency command center during a catastrophic electrical-grid failure.",
} as const satisfies ScenarioMetadata;

export const BLACKOUT_INITIAL_STATE = {
  metrics: { grid: 72, safety: 84, economy: 76, trust: 68 },
  hiddenMetrics: { cascadeRisk: 24 }, collaborationScore: BLACKOUT_COLLABORATION.initial,
  scenarioFlags: {
    helixExposed: false, informationSuppressed: false, suppressionExposed: false,
    trueCauseDiscovered: false, confirmedWrongdoingPublished: false, s7Isolated: false,
  },
} as const satisfies InitialScenarioState;

export const BLACKOUT_TIMINGS = {
  standard: { discussionSeconds: 60, normalVoteSeconds: 20, responseSelectionSeconds: 10,
    redlineVoteSeconds: 30, round5Discussion: "reuse_discussionSeconds" },
  demo: { discussionSeconds: 25, normalVoteSeconds: 10, responseSelectionSeconds: 5,
    redlineVoteSeconds: 15, round5Discussion: "reuse_discussionSeconds" },
} as const satisfies Record<GameMode, ModeTiming>;

export const BLACKOUT_TRUTH = {
  immutable: true,
  causes: ["PRE-EXISTING S7 DEGRADATION", "DELAYED MAINTENANCE", "ORACLE BUILD 7.4"],
  cascade: ["AGGRESSIVE LOAD REDISTRIBUTION", "THERMAL OVERLOAD", "TRANSFORMER FAILURE", "GRID CASCADE"],
  history: [
    "Three months before the crisis, Helix Energy discovered serious physical degradation in Transformer Cluster S7.",
    "Replacement required shutting down important industrial customers, approximately $18 million in repairs, and publicly acknowledging infrastructure problems.",
    "Marcus Vale received the immediate-replacement recommendation and approved delaying replacement until the next fiscal quarter.",
    "Six hours before the crisis, Dr. Maya Chen authorized ORACLE Optimization Build 7.4 despite incomplete load testing.",
    "Build 7.4 aggressively redistributed electrical load, exposing the already-degraded S7 cluster to conditions it could no longer tolerate.",
    "The resulting thermal overload triggered transformer failure and cascading failures.",
  ],
  causalConclusion: BLACKOUT_EVIDENCE.failure_correlation_analysis.significance,
  conclusion: "The crisis had no single cause.",
} as const;

export const BLACKOUT_RULES = {
  metricBounds: { min: 0, max: 100 },
  normalVote: { requiredApprovals: 3, totalPlayers: 4, abstainAllowed: false, disconnectedNonvoter: "no_vote" },
  normalRounds: {
    decisionsPerRound: 1, maxActiveProposalsPerPlayer: 1,
    selector: "host_or_mayor_emergency_order", selectionLocksWhenVotingBegins: true,
    unselectedProposals: "expire_at_round_end", failedVote: "inaction_then_round_complete",
    discussionTimeout: "response_selection_then_default_after_selection_timeout",
  },
  customActionDeltaBounds: { publicMetrics: { min: -15, max: 15 }, cascadeRisk: { min: -20, max: 20 } },
} as const;

/** Authoritative source configuration contains secrets. Do not import into UI or
 * expose this aggregate directly to clients. Later server logic filters delivery.
 */
export const BLACKOUT_SCENARIO = {
  metadata: BLACKOUT_METADATA, initialState: BLACKOUT_INITIAL_STATE, timings: BLACKOUT_TIMINGS,
  roles: BLACKOUT_ROLES, abilities: BLACKOUT_ABILITIES, rounds: BLACKOUT_ROUNDS,
  evidence: BLACKOUT_EVIDENCE, redline: BLACKOUT_REDLINE, endings: BLACKOUT_ENDINGS,
  scoring: BLACKOUT_SCORING, map: { sectors: BLACKOUT_SECTORS, initialState: BLACKOUT_INITIAL_MAP },
  disclosure: BLACKOUT_DISCLOSURE, publication: BLACKOUT_PUBLICATION_RULES,
  suppressionExposure: BLACKOUT_SUPPRESSION_EXPOSURE,
  truth: BLACKOUT_TRUTH, fallbackContent: BLACKOUT_FALLBACK_CONTENT, rules: BLACKOUT_RULES,
} as const;

