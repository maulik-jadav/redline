import type { PlayerId, ProposalId } from "./common";

/** Missing participation is the absence of a vote, not an abstain choice. */
export type NormalVoteChoice = "approve" | "reject";

export interface NormalVote {
  readonly proposalId: ProposalId;
  readonly playerId: PlayerId;
  choice: NormalVoteChoice;
}

export type RedlineChoice =
  | "total_grid_shutdown"
  | "trust_oracle"
  | "manual_takeover";

/** One current choice per player in a room's final ballot; the latest replaces
 * the previous selection while open. Future engine logic resolves three matching
 * selections exactly once. This model performs no counting or resolution.
 */
export interface RedlineBallotSelection {
  readonly playerId: PlayerId;
  choice: RedlineChoice;
}
