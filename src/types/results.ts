import type { PlayerId } from "./common";
import type { PublicMetrics } from "./metrics";
import type { PlayerRole } from "./player";

export type EndingId =
  | "catastrophic_cascade"
  | "grid_collapse"
  | "humanitarian_disaster"
  | "miracle_recovery"
  | "city_saved"
  | "pyrrhic_victory";

/** Canonical result overlay, separate from the main city ending. */
export type SpecialAchievement = "truth_exposed";

export type TeamGrade = "S" | "A" | "B" | "C" | "D" | "F";

export interface PersonalObjectiveResult {
  readonly playerId: PlayerId;
  readonly role: PlayerRole;
  objectiveName: string;
  completed: boolean;
  /** Omitted when no evaluable bonus applies; Maya's blame bonus is narrative-only. */
  bonusCompleted?: boolean;
}

export type AwardId =
  | "intelligence_officer"
  | "commander"
  | "diplomat"
  | "vault"
  | "whistleblower"
  | "chaos_agent"
  | "oracle";

export interface AwardResult {
  readonly awardId: AwardId;
  readonly playerId: PlayerId;
  reason?: string;
}

/** Engine-produced result data; this interface calculates no outcomes or scores. */
export interface GameResult {
  ending: EndingId;
  /** Valid runtime range: 0–10,000. */
  teamScore: number;
  grade: TeamGrade;
  finalMetrics: PublicMetrics;
  /** Valid runtime range: 0–100; authoritative result data. */
  finalCascadeRisk: number;
  /** Valid runtime range: 0–100. */
  collaborationScore: number;
  personalObjectives: readonly PersonalObjectiveResult[];
  /** Future deterministic selection displays at most four awards. */
  awards: readonly AwardResult[];
  specialAchievements: readonly SpecialAchievement[];
}
