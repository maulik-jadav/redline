import type { EvidenceId, PlayerId, RoomId, RoundNumber } from "./common";

/** Audience only. Shared/public evidence can never become private again. */
export type EvidenceVisibility = "private" | "shared" | "public";

/** Reliability, independent of audience: private evidence can be confirmed. */
export type EvidenceVerification = "unverified" | "confirmed" | "contradicted";

export type EvidenceKey =
  | "oracle_build_7_4_deployment"
  | "march_inspection_report"
  | "anonymous_s7_warning"
  | "anonymous_partial_march_report"
  | "hospital_impact_report"
  | "transformer_degradation_analysis"
  | "failure_correlation_analysis";

export interface Evidence {
  readonly id: EvidenceId;
  readonly roomId: RoomId;
  readonly key: EvidenceKey;
  title: string;
  description: string;
  visibility: EvidenceVisibility;
  verification: EvidenceVerification;
  /** Required for private evidence by future authorization rules. */
  ownerPlayerId?: PlayerId;
  discoveredRound?: RoundNumber;
}
