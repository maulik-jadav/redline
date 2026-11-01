import type { PublicMetricKey, SpecialAchievement, TeamGrade } from "@/types";
import type { AchievementDefinition, GradeDefinition } from "./config";

export const BLACKOUT_COLLABORATION = {
  initial: 50, bounds: { min: 0, max: 100 },
  rewards: {
    voteParticipation: { points: 2, scope: "once_per_player_per_authoritative_vote" },
    uniqueIntelligenceShared: { points: 3, scope: "once_per_unique_item" },
    confirmedEvidenceShared: { points: 2, scope: "once_per_unique_confirmed_item", additionalTo: "uniqueIntelligenceShared" },
    successfulPlayerProposal: { points: 3, scope: "once_per_successful_player_proposal", attribution: "creator", canonicalEligible: false },
    usefulRoleAbility: { points: 3, scope: "once_per_successful_ability_use" },
    confirmedWrongdoingPublished: { points: 5, scope: "once_globally" },
  },
  chatVolumeReward: 0, reactionVolumeReward: 0,
} as const;

export const BLACKOUT_SCORE_WEIGHTS = {
  grid: 0.20, safety: 0.25, economy: 0.15, trust: 0.15, collaboration: 0.25,
} as const satisfies Record<PublicMetricKey | "collaboration", number>;

export const BLACKOUT_GRADES = {
  S: { grade: "S", min: 9000, max: 10000 },
  A: { grade: "A", min: 8000, max: 8999 },
  B: { grade: "B", min: 7000, max: 7999 },
  C: { grade: "C", min: 6000, max: 6999 },
  D: { grade: "D", min: 4000, max: 5999 },
  F: { grade: "F", min: 0, max: 3999 },
} as const satisfies { [Grade in TeamGrade]: GradeDefinition & { readonly grade: Grade } };

export const BLACKOUT_ACHIEVEMENTS = {
  truth_exposed: {
    id: "truth_exposed", name: "THE TRUTH EXPOSED",
    conditions: [
      { kind: "flag", flag: "trueCauseDiscovered", value: true },
      { kind: "flag", flag: "confirmedWrongdoingPublished", value: true },
    ],
  },
} as const satisfies Record<SpecialAchievement, AchievementDefinition>;

export const BLACKOUT_SCORING = {
  weights: BLACKOUT_SCORE_WEIGHTS,
  scoreScale: 100, rounding: "nearest_integer", scoreBounds: { min: 0, max: 10000 },
  grades: BLACKOUT_GRADES, collaboration: BLACKOUT_COLLABORATION,
  achievements: BLACKOUT_ACHIEVEMENTS,
  awards: {
    maximumDisplayed: 4, selection: "deterministic_event_counters",
    tieBreak: ["earliest_qualifying_timestamp_where_meaningful", "otherwise_omit"],
    aiSelectionAllowed: false,
  },
} as const;
