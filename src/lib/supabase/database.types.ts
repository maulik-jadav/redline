/** Schema-aligned MANUAL types, not CLI-generated. Keep in sync with migrations.
 * Structured JSON columns describe small engine metadata/results, not an opaque
 * whole-state blob. The RPC's JSON shape is explicitly modeled below.
 */
import type { CanonicalResponseId } from "@/data/blackout";
import type { EngineTimelineEntry } from "@/lib/game";
import type { LobbyView } from "@/types/lobby";
import type { AiRecord } from "@/lib/ai/game-master";
import type { BriefingContext } from "@/types/briefing";
export type CrisisMember={id:string;display_name:string;role:PlayerRole|null;is_host:boolean};
import type {
  EvidenceKey, EvidenceVerification, EvidenceVisibility, GameEventType, GameMode,
  GamePhase, GameResult, GameStatus, GridMapState, MetricEffects, NormalVoteChoice,
  PlayerActivity, PlayerConnectionStatus, PlayerRole, ProposalSource, ProposalStatus,
  RedlineChoice, RoleAbilityId, RoundNumber, ScenarioId, IntelConfidence, EventSeverity,
} from "@/types";

export type RoomRow = {
  id: string; code: string; scenario_id: ScenarioId; mode: GameMode; status: GameStatus;
  host_player_id: string | null; created_at: string; started_at: string | null; completed_at: string | null;
};
export type PlayerRow = {
  id: string; room_id: string; display_name: string; role: PlayerRole | null; is_host: boolean;
  is_ready: boolean; connection_status: PlayerConnectionStatus; activity: PlayerActivity;
  joined_at: string; updated_at: string; left_at: string | null; briefing_acknowledged_at:string|null;
};
export type PlayerSessionRow = { player_id: string; room_id: string; token_hash: string; created_at: string; revoked_at: string | null };
export type GameStateRow = {
  round_start_metrics?:import("@/types").PublicMetrics|null;
  room_id: string; scenario_id: ScenarioId; mode: GameMode; status: GameStatus; phase: GamePhase; round: RoundNumber | null;
  grid: number; safety: number; economy: number; trust: number; cascade_risk: number; collaboration_score: number;
  helix_exposed: boolean; information_suppressed: boolean; suppression_exposed: boolean;
  true_cause_discovered: boolean; confirmed_wrongdoing_published: boolean; s7_isolated: boolean;
  selected_proposal_id: string | null; active_event_id: string | null; phase_ends_at: string | null;
  started_at: string | null; completed_at: string | null; version: number; updated_at: string;
  map: GridMapState; role_assignments: Record<PlayerRole,string>; resolved_rounds: RoundNumber[];
  executed_responses: CanonicalResponseId[]; suppression_evidence_snapshot: EvidenceKey[];
  contributions: Record<string,number>; redline_resolution: RedlineChoice | "deadlock" | null; result: GameResult | null;
};
export type ProposalRow = {
  id: string; sequence_no: number; room_id: string; round: 1|2|3|4; creator_player_id: string | null;
  title: string; action: string; reason: string; source: ProposalSource; status: ProposalStatus;
  canonical_response_id: CanonicalResponseId | null; disclosure_evidence: EvidenceKey[];
  selected_by: string | null; initiated_by: string | null; created_at: string; resolved_at: string | null;
};
export type VoteRow = { room_id: string; proposal_id: string; player_id: string; choice: NormalVoteChoice; sequence_no: number; created_at: string };
export type BallotRow = { room_id: string; player_id: string; choice: RedlineChoice; updated_at: string };
export type EvidenceRow = {
  id: string; sequence_no: number; room_id: string; key: EvidenceKey; title: string; description: string;
  owner_player_id: string | null; visibility: EvidenceVisibility; verification: EvidenceVerification;
  discovered_round: RoundNumber | null; created_at: string; updated_at: string;
};
export type AbilityRow = { room_id: string; player_id: string; ability_id: RoleAbilityId; owner_role: PlayerRole; max_uses: number; uses_remaining: number; updated_at: string };
export type EventRow = { room_id: string; id: string; sequence_no: number; round: RoundNumber | null; type: GameEventType;
  severity: EventSeverity; headline: string; description: string; metric_effects: MetricEffects | null };
export type TimelineMetadata = Pick<EngineTimelineEntry,"evidenceKeys"|"participantIds"|"abilityId"|"proposalId"|"responseId">;
export type TimelineRow = { room_id: string; id: string; sequence_no: number; type: EngineTimelineEntry["type"];
  round: RoundNumber | null; player_id: string | null; message: string; occurred_at: string; metadata: TimelineMetadata };
export type IntelRow = { room_id: string; id: string; sequence_no: number; player_id: string; round: RoundNumber;
  content: string | null; confidence: IntelConfidence | null; additional_clues: string[] | null;
  visibility: EvidenceVisibility; evidence_key: EvidenceKey | null };
export type CommandRow = { room_id: string; command_id: string; sequence_no: number; processed_at: string };
export type RewardRow = { room_id: string; reward_key: string; sequence_no: number };
export type MessageRow = { id: string; room_id: string; player_id: string | null; message: string;
  message_type: "chat"|"system"|"intel_shared"|"decision"|"warning"; created_at: string };

export type PersistenceSnapshot = {
  game_state: GameStateRow; proposals: ProposalRow[]; votes: VoteRow[]; redline_ballots: BallotRow[];
  evidence: EvidenceRow[]; player_abilities: AbilityRow[]; events: EventRow[]; timeline: TimelineRow[];
  private_intel: IntelRow[]; processed_commands: CommandRow[]; collaboration_rewards: RewardRow[];
};

type Table<Row, Defaults extends keyof Row = never> = {
  Row: Row; Insert: Omit<Row,Defaults> & Partial<Pick<Row,Defaults>>; Update: Partial<Row>; Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      game_ai:Table<{room_id:string;request_key:string;status:"pending"|"complete"|"failed";payload:AiRecord|null;created_at:string},"status"|"payload"|"created_at">;
      rooms: Table<RoomRow,"created_at"|"host_player_id"|"started_at"|"completed_at">;
      players: Table<PlayerRow,"role"|"is_host"|"is_ready"|"connection_status"|"activity"|"joined_at"|"updated_at"|"left_at"|"briefing_acknowledged_at">;
      lobby_entry_requests: Table<{request_id:string;fingerprint:string;token_hash:string;room_id:string;player_id:string;created_at:string},"created_at">;
      player_sessions: Table<PlayerSessionRow,"created_at"|"revoked_at">;
      game_states: Table<GameStateRow>;
      proposals: Table<ProposalRow,"created_at"|"resolved_at"|"disclosure_evidence"|"creator_player_id"|"canonical_response_id"|"selected_by"|"initiated_by">;
      votes: Table<VoteRow,"created_at">;
      redline_ballots: Table<BallotRow,"updated_at">;
      evidence: Table<EvidenceRow,"created_at"|"updated_at"|"owner_player_id"|"discovered_round">;
      player_abilities: Table<AbilityRow,"updated_at">;
      events: Table<EventRow,"round"|"metric_effects">;
      timeline: Table<TimelineRow,"round"|"player_id"|"metadata">;
      private_intel: Table<IntelRow,"confidence"|"additional_clues"|"content"|"evidence_key">;
      processed_commands: Table<CommandRow>; collaboration_rewards: Table<RewardRow>;
      messages: Table<MessageRow,"created_at"|"player_id">;
    };
    Views: Record<string,never>;
    Functions: {
      reserve_game_ai:{Args:{p_room_id:string;p_request_key:string};Returns:boolean};
      commit_gameplay:{Args:{p_room_id:string;p_player_id:string;p_token_hash:string;p_expected_version:number;p_root_command_id:string;p_steps:PersistenceSnapshot[]};Returns:undefined};
      get_crisis_members:{Args:{p_code:string;p_player_id:string;p_token_hash:string};Returns:CrisisMember[]};
      commit_round_one:{Args:{p_room_id:string;p_player_id:string;p_token_hash:string;p_expected_version:number;p_root_command_id:string;p_steps:PersistenceSnapshot[]};Returns:undefined};
      initiate_crisis:{Args:{p_room_id:string;p_player_id:string;p_token_hash:string;p_command_id:string;p_initial:PersistenceSnapshot;p_started:PersistenceSnapshot};Returns:undefined};
      get_briefing_context:{Args:{p_code:string;p_player_id:string;p_token_hash:string};Returns:BriefingContext};
      acknowledge_briefing:{Args:{p_room_id:string;p_player_id:string;p_token_hash:string;p_expected_version:number;p_next:PersistenceSnapshot|null;p_command_id:string};Returns:undefined};
      can_access_lobby_realtime: {Args:{topic:string};Returns:boolean};
      persist_engine_snapshot: { Args: { p_room_id: string; p_expected_version: number | null; p_command_id: string | null; p_snapshot: PersistenceSnapshot }; Returns: number };
      load_engine_snapshot: { Args: { p_room_id: string }; Returns: PersistenceSnapshot | null };
      enter_lobby: { Args: {p_request_id:string;p_fingerprint:string;p_token_hash:string;p_operation:string;p_room_id:string;
        p_player_id:string;p_code:string;p_callsign:string;p_mode:string|null}; Returns:{room_id:string;player_id:string;code:string} };
      get_lobby_snapshot: {Args:{p_code:string;p_player_id:string;p_token_hash:string};Returns:LobbyView};
      update_lobby_member: {Args:{p_room_id:string;p_player_id:string;p_token_hash:string;p_action:string;p_ready?:boolean|null};Returns:undefined};
    };
    Enums: Record<string,never>;
    CompositeTypes: Record<string,never>;
  };
};
