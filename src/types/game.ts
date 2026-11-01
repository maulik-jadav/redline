import type {
  EventId,
  IsoTimestamp,
  ProposalId,
  RoomId,
  RoundNumber,
} from "./common";
import type { HiddenMetrics, PublicMetrics } from "./metrics";

export type GameStatus = "waiting" | "active" | "completed";

export type GamePhase =
  | "lobby"
  | "briefing"
  | "mission_intro"
  | "round_intro"
  | "discussion"
  | "response_selection"
  | "voting"
  | "resolution"
  | "consequence"
  | "redline_protocol"
  | "results";

export type GameMode = "standard" | "demo";
export type ScenarioId = "blackout";

export interface ScenarioFlags {
  helixExposed: boolean;
  informationSuppressed: boolean;
  suppressionExposed: boolean;
  trueCauseDiscovered: boolean;
  confirmedWrongdoingPublished: boolean;
  s7Isolated: boolean;
}

/** Authoritative domain state, not a public/client DTO. Clients submit intentions;
 * future server logic owns mutations and filters hidden information. AI output
 * cannot override this state. Related entities are modeled in separate modules.
 */
export interface GameState {
  readonly roomId: RoomId;
  readonly scenarioId: ScenarioId;
  mode: GameMode;
  status: GameStatus;
  phase: GamePhase;
  /** Absent before Round 1; REDLINE Protocol retains Round 5. */
  round?: RoundNumber;
  metrics: PublicMetrics;
  hiddenMetrics: HiddenMetrics;
  /** Valid runtime range: 0–100. */
  collaborationScore: number;
  scenarioFlags: ScenarioFlags;
  selectedProposalId?: ProposalId;
  activeEventId?: EventId;
  phaseEndsAt?: IsoTimestamp;
  startedAt?: IsoTimestamp;
  completedAt?: IsoTimestamp;
  /** Revision for future optimistic/concurrency-safe authoritative mutations. */
  version: number;
}
