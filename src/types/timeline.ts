import type {
  IsoTimestamp,
  PlayerId,
  RoomId,
  RoundNumber,
  TimelineEntryId,
} from "./common";

export type TimelineEventType =
  | "game_start"
  | "briefing_completed"
  | "round_start"
  | "intelligence_shared"
  | "ability_used"
  | "proposal_selected"
  | "vote_outcome"
  | "inaction_consequence"
  | "decision_executed"
  | "public_disclosure"
  | "helix_exposed"
  | "suppression_exposed"
  | "redline_activated"
  | "final_vote"
  | "ending";

/** Must originate from an actual authoritative event, never fabricated by AI. */
export interface TimelineEntry {
  readonly id: TimelineEntryId;
  readonly roomId: RoomId;
  type: TimelineEventType;
  message: string;
  occurredAt: IsoTimestamp;
  round?: RoundNumber;
  playerId?: PlayerId;
}
