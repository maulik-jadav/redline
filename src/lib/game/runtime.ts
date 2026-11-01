import type { CanonicalResponseId, IntelDefinition } from "@/data/blackout";
import type {
  Evidence, EvidenceKey, GameEvent, GameResult, GameState, GridMapState,
  IsoTimestamp, NormalVote, PlayerId, PlayerRole, Proposal, RedlineChoice,
  RoleAbility, RoleAbilityId, RoundNumber, TimelineEntry,
} from "@/types";

/** IDs are deterministically namespaced under a unique caller-supplied command ID. */
export interface CommandContext {
  commandId: string;
  occurredAt: IsoTimestamp;
  expectedVersion?: number;
}

export interface Actor { playerId: PlayerId; isHost?: boolean }

export interface RuntimeProposal {
  proposal: Proposal;
  canonicalResponseId?: CanonicalResponseId;
  disclosureEvidence: EvidenceKey[];
  selectedBy?: PlayerId;
  initiatedBy?: PlayerId;
}

export interface PrivateIntelligence extends IntelDefinition {
  id: string;
  ownerPlayerId: PlayerId;
  round: RoundNumber;
  visibility: "private" | "shared" | "public";
  evidenceKey?: EvidenceKey;
}

export interface EngineTimelineEntry extends TimelineEntry {
  evidenceKeys?: EvidenceKey[];
  participantIds?: PlayerId[];
  abilityId?: RoleAbilityId;
  proposalId?: string;
  responseId?: CanonicalResponseId;
}

/** Server-only authoritative state. No transport or client delivery is defined here. */
export interface EngineState extends GameState {
  /** Presentation baseline captured by the atomic server adapter at round entry. */
  roundStartMetrics?:import("@/types").PublicMetrics;
  roleAssignments: Record<PlayerRole, PlayerId>;
  map: GridMapState;
  proposals: Record<string, RuntimeProposal>;
  votes: Record<string, NormalVote[]>;
  evidence: Partial<Record<EvidenceKey, Evidence>>;
  privateIntel: PrivateIntelligence[];
  abilities: Record<RoleAbilityId, RoleAbility>;
  events: GameEvent[];
  timeline: EngineTimelineEntry[];
  resolvedRounds: RoundNumber[];
  executedResponses: CanonicalResponseId[];
  suppressionEvidence: EvidenceKey[];
  collaborationRewards: string[];
  contributions: Record<PlayerId, number>;
  processedCommands: string[];
  redlineSelections: Partial<Record<PlayerId, RedlineChoice>>;
  redlineResolution?: RedlineChoice | "deadlock";
  result?: GameResult;
}
