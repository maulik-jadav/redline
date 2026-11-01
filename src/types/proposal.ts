import type { PlayerId, ProposalId, RoomId, RoundNumber } from "./common";

export type ProposalStatus =
  | "pending"
  | "selected"
  | "voting"
  | "approved"
  | "rejected"
  | "expired"
  | "executed";

export type ProposalSource = "player" | "canonical";

/** Vocabulary for future classification; no classification behavior is defined. */
export type ActionCategory =
  | "power_reroute"
  | "shutdown"
  | "investigate"
  | "public_disclosure"
  | "emergency_response"
  | "economic_protection"
  | "grid_stabilization"
  | "other";

interface ProposalBase {
  readonly id: ProposalId;
  readonly roomId: RoomId;
  /** Normal proposals exist only in Rounds 1–4. */
  readonly round: Exclude<RoundNumber, 5>;
  title: string;
  action: string;
  reason: string;
  status: ProposalStatus;
}

export interface PlayerProposal extends ProposalBase {
  readonly source: Extract<ProposalSource, "player">;
  readonly creatorPlayerId: PlayerId;
}

export interface CanonicalProposal extends ProposalBase {
  readonly source: Extract<ProposalSource, "canonical">;
  /** Canonical responses have no player creator or creator collaboration bonus. */
  readonly creatorPlayerId?: never;
}

export type Proposal = PlayerProposal | CanonicalProposal;
