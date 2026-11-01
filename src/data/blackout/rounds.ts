import type { RoundDefinitions } from "./config";
import { BLACKOUT_DISCLOSURE, BLACKOUT_SUPPRESSION_EXPOSURE } from "./disclosure";
import { BLACKOUT_EVIDENCE } from "./evidence";

export const BLACKOUT_ROUNDS = {
  1: {
    round: 1, name: "GRID ANOMALY", purpose: "Investigate asymmetric clues and choose an initial Sector 7 response.",
    publicEvent: { headline: "GRID ANOMALY DETECTED", severity: "warning",
      description: "ORACLE has detected abnormal power oscillations across Sector 7." },
    mapChanges: { sectors: { sector_7: "warning" } },
    privateIntel: {
      engineer: { text: "ORACLE began aggressive load redistribution approximately six hours ago — shortly after Build 7.4 was deployed.", confidence: "high" },
      mayor: { text: "Sector 7 contains St. Anne's Medical District and approximately 210,000 residents.", confidence: "high" },
      executive: { text: "Helix maintenance records classify Transformer Cluster S7 as \"monitor closely.\"", confidence: "medium" },
      journalist: { text: BLACKOUT_EVIDENCE.anonymous_s7_warning.content, confidence: "low" },
    },
    normalProposalVote: true,
    responses: {
      r1_reduce_sector_7_load: { id: "r1_reduce_sector_7_load", title: "Reduce Sector 7 Load", kind: "fixed",
        effects: { grid: 4, safety: 0, economy: -6, trust: 1, cascadeRisk: -10 } },
      r1_maintain_normal_operations: { id: "r1_maintain_normal_operations", title: "Maintain Normal Operations", kind: "fixed",
        effects: { grid: -3, safety: 0, economy: 2, trust: 0, cascadeRisk: 12 } },
      r1_investigate_before_acting: { id: "r1_investigate_before_acting", title: "Investigate Before Acting", kind: "fixed",
        effects: { grid: -1, safety: 0, economy: 0, trust: 0, cascadeRisk: 6 } },
    },
    defaultResponse: "r1_investigate_before_acting", inactionEffects: { grid: -2, cascadeRisk: 6 },
    evidence: ["anonymous_s7_warning"],
  },
  2: {
    round: 2, name: "LIFE SUPPORT", purpose: "Prioritize hospital power against grid and economic costs.",
    publicEvent: { headline: "ST. ANNE'S POWER FAILURE", severity: "critical",
      description: "Grid instability has forced St. Anne's Hospital onto backup power." },
    mapChanges: { sectors: {medical:"warning"} },
    privateIntel: {
      engineer: { text: "Hospital backup generators can sustain critical systems for approximately six minutes." },
      mayor: { text: BLACKOUT_EVIDENCE.hospital_impact_report.content },
      executive: { text: "Industrial District 4 has enough capacity to power the hospital, but rerouting it will trigger contractual penalties." },
      journalist: { text: "Hospital administrators warned Helix about unstable power twice this month." },
    },
    normalProposalVote: true,
    // No generic base effect: exactly one severity variant supplies the event effects.
    severity: {
      sample: "pre_event_cascadeRisk", application: "replace_base_effects",
      variants: {
        low: { conditions: [{ kind: "metric", metric: "cascadeRisk", operator: "lte", value: 39 }],
          narrative: "Grid instability has forced St. Anne's Hospital onto backup power.", effects: { safety: -5, trust: -2 } },
        medium: { conditions: [
          { kind: "metric", metric: "cascadeRisk", operator: "gte", value: 40 },
          { kind: "metric", metric: "cascadeRisk", operator: "lte", value: 69 },
        ], narrative: "A transformer failure has disconnected St. Anne's Hospital from the primary grid.", effects: { safety: -7, trust: -3 } },
        high: { conditions: [{ kind: "metric", metric: "cascadeRisk", operator: "gte", value: 70 }],
          narrative: "St. Anne's has lost primary power and backup-generation stability is deteriorating.", effects: { safety: -10, trust: -5 } },
      },
    },
    responses: {
      r2_reroute_industrial_power: { id: "r2_reroute_industrial_power", title: "Reroute Industrial Power", kind: "fixed",
        effects: { grid: -3, safety: 12, economy: -9, trust: 5, cascadeRisk: 4 } },
      r2_emergency_generators_only: { id: "r2_emergency_generators_only", title: "Emergency Generators Only", kind: "fixed",
        effects: { grid: 0, safety: 4, economy: -2, trust: -1, cascadeRisk: 0 } },
      r2_stabilize_grid_before_hospital: { id: "r2_stabilize_grid_before_hospital", title: "Stabilize Grid Before Hospital", kind: "fixed",
        effects: { grid: 8, safety: -12, economy: 1, trust: -8, cascadeRisk: -10 } },
    },
    defaultResponse: "r2_emergency_generators_only", inactionEffects: { safety: -4, trust: -2, cascadeRisk: 4 },
    evidence: ["hospital_impact_report"],
  },
  3: {
    round: 3, name: "CASCADE", purpose: "Respond to cascading infrastructure failure and investigate S7 degradation.",
    publicEvent: { headline: "CASCADING GRID FAILURE", severity: "critical",
      description: "Transportation control systems begin failing." },
    baseEffects: { grid: -7, safety: -4, economy: -5, trust: -3 },
    mapChanges: { sectors: { sector_7: "critical", medical: "warning", central: "warning" }, transit: "critical" },
    privateIntel: {
      engineer: { text: "Transformer temperatures are significantly beyond safe operating range.",
        additionalClues: ["The pattern does not resemble a cyberattack."] },
      mayor: { text: "Emergency services report 23 traffic collisions after signal failures." },
      executive: { text: "A restricted maintenance report exists for Transformer Cluster S7." },
      journalist: { text: "Ask Vale about the March inspection." },
    },
    normalProposalVote: true,
    responses: {
      r3_isolate_s7: { id: "r3_isolate_s7", title: "Isolate S7", kind: "fixed",
        effects: { grid: 10, safety: 4, economy: -12, trust: -2, cascadeRisk: -18 }, flags: { s7Isolated: true } },
      r3_redistribute_through_oracle: { id: "r3_redistribute_through_oracle", title: "Redistribute Through ORACLE", kind: "fixed",
        effects: { grid: 5, safety: 2, economy: -3, trust: 1, cascadeRisk: 8 } },
      r3_keep_s7_online: { id: "r3_keep_s7_online", title: "Keep S7 Online", kind: "fixed",
        effects: { grid: -8, safety: -6, economy: 4, trust: 0, cascadeRisk: 18 } },
    },
    defaultResponse: "r3_redistribute_through_oracle", inactionEffects: { grid: -5, safety: -3, cascadeRisk: 10 },
    evidence: ["march_inspection_report", "transformer_degradation_analysis"],
  },
  4: {
    round: 4, name: "THE LEAK", purpose: "Choose disclosure, suppression, or investigation as evidence implicates crisis participants.",
    publicEvent: { headline: "MEDIA REPORTS QUESTION HELIX", severity: "warning",
      description: "Reports are emerging that infrastructure warnings may have existed before today's crisis." },
    mapChanges: { sectors: {} },
    // Section 87.11 supplies evidence rather than inventing additional role messages.
    privateIntel: {
      engineer: { text: BLACKOUT_EVIDENCE.oracle_build_7_4_deployment.content },
    },
    normalProposalVote: true,
    responses: {
      r4_publicly_disclose_known_evidence: { id: "r4_publicly_disclose_known_evidence", title: "Publicly Disclose Known Evidence",
        kind: "public_disclosure", disclosure: BLACKOUT_DISCLOSURE },
      r4_suppress_information_until_crisis_ends: { id: "r4_suppress_information_until_crisis_ends", title: "Suppress Information Until Crisis Ends", kind: "fixed",
        effects: { trust: 1, economy: 2 }, flags: { informationSuppressed: true }, suppressionExposure: BLACKOUT_SUPPRESSION_EXPOSURE },
      r4_independent_investigation: { id: "r4_independent_investigation", title: "Independent Investigation", kind: "fixed",
        effects: { trust: 4, economy: -2 }, contributesToEvidence: "failure_correlation_analysis" },
    },
    defaultResponse: "r4_independent_investigation", inactionEffects: { trust: -3 },
    evidence: ["oracle_build_7_4_deployment", "anonymous_partial_march_report", "failure_correlation_analysis"],
  },
  5: {
    round: 5, name: "SYSTEM FAILURE", purpose: "Confront simultaneous failures and enter the final REDLINE decision.",
    publicEvent: { headline: "CRITICAL INFRASTRUCTURE FAILURE", severity: "critical",
      description: "Multiple sectors destabilize simultaneously." },
    baseEffects: { grid: -10, safety: -7, economy: -6, trust: -4, cascadeRisk: 10 },
    mapChanges: { sectors: { north: "warning", central: "critical", medical: "critical", industrial: "warning", sector_7: "critical" }, transit: "offline" },
    privateIntel: {}, evidence: [], normalProposalVote: false, nextPhase: "redline_protocol",
    discussionTiming: "mode_discussionSeconds",
    severity: {
      sample: "pre_event_cascadeRisk", application: "multiply_each_base_delta", rounding: "half-away-from-zero",
      finalMetricBounds: { min: 0, max: 100 },
      variants: {
        contained: { conditions: [{ kind: "metric", metric: "cascadeRisk", operator: "lt", value: 50 }], multiplier: 0.75 },
        severe: { conditions: [
          { kind: "metric", metric: "cascadeRisk", operator: "gte", value: 50 },
          { kind: "metric", metric: "cascadeRisk", operator: "lte", value: 74 },
        ], multiplier: 1.0 },
        critical: { conditions: [{ kind: "metric", metric: "cascadeRisk", operator: "gte", value: 75 }], multiplier: 1.25 },
      },
    },
    npcMessages: [
      { sender: "Dr. Priya Shah — St. Anne's Hospital", headline: "ST. ANNE'S HOSPITAL",
        description: "We're losing backup systems. I need to know whether power is coming back." },
      { sender: "Chief Ramirez — Emergency Services", headline: "EMERGENCY SERVICES",
        description: "Traffic systems are down across three districts." },
      { sender: "ORACLE", headline: "CASCADE RISK ESTIMATE",
        description: "Projected probability of uncontrolled cascade: {cascadeRisk}%." },
    ],
  },
} as const satisfies RoundDefinitions;
