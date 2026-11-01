/** BLACKOUT definition types only; no condition evaluators or runtime entities. */
import type {
  CharacterId, CharacterName, EndingId, EventSeverity, EvidenceKey,
  EvidenceVerification, EvidenceVisibility, GamePhase, HiddenMetrics,
  IntelConfidence, MetricEffects, PlayerRole, PublicMetricKey, PublicMetrics,
  RedlineChoice, RoleAbilityId, RoundNumber, ScenarioFlags, ScenarioId,
  SectorId, SectorStatus, SpecialAchievement, TeamGrade,
} from "@/types";

export type Condition =
  | { readonly kind: "metric"; readonly metric: PublicMetricKey | "cascadeRisk";
      readonly operator: "lt" | "lte" | "gte"; readonly value: number }
  | { readonly kind: "flag"; readonly flag: keyof ScenarioFlags; readonly value: boolean };

export interface ScenarioMetadata {
  readonly id: ScenarioId;
  readonly name: string;
  readonly location: string;
  readonly year: number;
  readonly population: number;
  readonly energyProvider: string;
  readonly gridAi: string;
  readonly rounds: 5;
  readonly tagline: string;
  readonly framing: string;
}

export interface InitialScenarioState {
  readonly metrics: PublicMetrics;
  readonly hiddenMetrics: HiddenMetrics;
  readonly collaborationScore: number;
  readonly scenarioFlags: ScenarioFlags;
}

export interface ModeTiming {
  readonly discussionSeconds: number;
  readonly normalVoteSeconds: number;
  readonly responseSelectionSeconds: number;
  readonly redlineVoteSeconds: number;
  readonly round5Discussion: "reuse_discussionSeconds";
}

export interface AbilityDefinition {
  readonly id: RoleAbilityId;
  readonly ownerRole: PlayerRole;
  readonly name: string;
  readonly description: string;
  readonly maxUses: number;
}

export interface RoleDefinition {
  readonly role: PlayerRole;
  readonly characterId: CharacterId;
  readonly characterName: CharacterName;
  readonly title: string;
  readonly publicResponsibility: string;
  readonly secret: string;
  readonly primaryObjective: {
    readonly name: string;
    /** All conditions must hold. */
    readonly conditions: readonly Condition[];
  };
  readonly bonusObjective?:
    | { readonly kind: "narrative_only"; readonly description: string }
    | { readonly kind: "publication"; readonly description: string;
        readonly evidence: EvidenceKey; readonly verification: "confirmed";
        readonly visibility: "public"; readonly attributedToRole: PlayerRole;
        readonly actions: readonly (RoleAbilityId | CanonicalResponseId)[] };
  readonly ability: AbilityDefinition;
}

export interface EvidenceRequirement {
  readonly key: EvidenceKey;
  readonly verification: "confirmed";
  readonly visibility: readonly ["shared", "public"];
}

export type EvidenceDiscovery =
  | { readonly kind: "automatic"; readonly round: RoundNumber }
  | { readonly kind: "early_intelligence" }
  | { readonly kind: "ability_use"; readonly abilityId: RoleAbilityId;
      readonly earliestRound: RoundNumber; readonly target?: SectorId }
  | { readonly kind: "conditional_automatic"; readonly round: RoundNumber;
      readonly unlessEvidence: EvidenceRequirement }
  | { readonly kind: "correlation"; readonly paths: readonly [
      { readonly kind: "all_evidence"; readonly evidence: readonly EvidenceRequirement[] },
      { readonly kind: "approved_response_and_any_evidence"; readonly round: 4;
        readonly responseId: ResponseIdsByRound[4]; readonly evidence: readonly EvidenceRequirement[] }
    ]; readonly flags: Partial<ScenarioFlags>; readonly maximumUnlocks: 1 };

export interface EvidenceDefinition {
  readonly key: EvidenceKey;
  readonly title: string;
  readonly content: string;
  readonly ownerRole?: PlayerRole;
  readonly verification: EvidenceVerification;
  readonly visibility: EvidenceVisibility;
  readonly earliestDiscoveryRound?: RoundNumber;
  readonly discovery: EvidenceDiscovery;
  readonly significance: string;
}

export interface IntelDefinition {
  readonly text: string;
  readonly confidence?: IntelConfidence;
  readonly additionalClues?: readonly string[];
}

export interface ResponseIdsByRound {
  1: "r1_reduce_sector_7_load" | "r1_maintain_normal_operations" | "r1_investigate_before_acting";
  2: "r2_reroute_industrial_power" | "r2_emergency_generators_only" | "r2_stabilize_grid_before_hospital";
  3: "r3_isolate_s7" | "r3_redistribute_through_oracle" | "r3_keep_s7_online";
  4: "r4_publicly_disclose_known_evidence" | "r4_suppress_information_until_crisis_ends" | "r4_independent_investigation";
}

export type NormalRoundNumber = keyof ResponseIdsByRound;
export type CanonicalResponseId = ResponseIdsByRound[NormalRoundNumber];

export interface DisclosureCategory {
  readonly priority: number;
  readonly verification: "confirmed" | "unverified";
  readonly qualifyingEvidence?: readonly EvidenceKey[];
  readonly effects: MetricEffects;
  readonly flags?: Partial<ScenarioFlags>;
}

export interface DisclosurePolicy {
  readonly eligibility: "known_to_room_or_legitimately_possessed_by_publisher";
  readonly visibility: "public";
  readonly consequenceSelection: "highest_priority_once_per_disclosure";
  readonly categories: {
    readonly confirmed_helix_wrongdoing: DisclosureCategory;
    readonly confirmed_non_helix: DisclosureCategory;
    readonly unverified: DisclosureCategory;
  };
}

export interface SuppressionExposureRule {
  readonly trigger: "later_publication_of_confirmed_evidence_available_to_room_at_suppression";
  readonly effects: MetricEffects;
  readonly flags: Partial<ScenarioFlags>;
  readonly maximumApplications: 1;
}

export type ResponseDefinition<Id extends CanonicalResponseId> = {
  readonly id: Id;
  readonly title: string;
} & (
  | { readonly kind: "fixed"; readonly effects: MetricEffects;
      readonly flags?: Partial<ScenarioFlags>;
      readonly suppressionExposure?: SuppressionExposureRule;
      readonly contributesToEvidence?: EvidenceKey }
  | { readonly kind: "public_disclosure"; readonly disclosure: DisclosurePolicy }
);

export interface Narrative {
  readonly headline: string;
  readonly description: string;
}

interface RoundBase {
  readonly name: string;
  readonly purpose: string;
  readonly publicEvent: Narrative & { readonly severity: EventSeverity };
  readonly mapChanges: { readonly sectors: Partial<Record<SectorId, SectorStatus>>;
    readonly transit?: SectorStatus };
  readonly privateIntel: Partial<Record<PlayerRole, IntelDefinition>>;
  /** References discovery definitions; does not execute an unlock. */
  readonly evidence: readonly EvidenceKey[];
}

export interface NormalRoundDefinition<R extends NormalRoundNumber> extends RoundBase {
  readonly round: R;
  readonly normalProposalVote: true;
  readonly privateIntel: R extends 4 ? Partial<Record<PlayerRole, IntelDefinition>> : Record<PlayerRole, IntelDefinition>;
  readonly responses: { readonly [Id in ResponseIdsByRound[R]]: ResponseDefinition<Id> };
  readonly defaultResponse: ResponseIdsByRound[R];
  readonly inactionEffects: MetricEffects;
  readonly baseEffects?: MetricEffects;
  readonly severity?: {
    readonly sample: "pre_event_cascadeRisk";
    readonly application: "replace_base_effects";
    readonly variants: Record<"low" | "medium" | "high", {
      readonly conditions: readonly Condition[];
      readonly narrative: string;
      readonly effects: MetricEffects;
    }>;
  };
}

export interface FinalRoundDefinition extends RoundBase {
  readonly round: 5;
  readonly normalProposalVote: false;
  readonly nextPhase: Extract<GamePhase, "redline_protocol">;
  readonly discussionTiming: "mode_discussionSeconds";
  readonly baseEffects: MetricEffects;
  readonly severity: {
    readonly sample: "pre_event_cascadeRisk";
    readonly application: "multiply_each_base_delta";
    readonly rounding: "half-away-from-zero";
    readonly finalMetricBounds: { readonly min: number; readonly max: number };
    readonly variants: Record<"contained" | "severe" | "critical", {
      readonly conditions: readonly Condition[]; readonly multiplier: number;
    }>;
  };
  readonly npcMessages: readonly (Narrative & { readonly sender: string })[];
}

export type RoundDefinitions = {
  readonly [R in NormalRoundNumber]: NormalRoundDefinition<R>;
} & { readonly 5: FinalRoundDefinition };

export type RedlineOption = {
  readonly id: RedlineChoice;
  readonly name: string;
  readonly description: string;
} & (
  | { readonly kind: "fixed"; readonly effects: MetricEffects }
  | { readonly kind: "flag_branches"; readonly flag: "s7Isolated";
      readonly whenTrue: MetricEffects; readonly whenFalse: MetricEffects }
);

export interface EndingDefinition {
  readonly id: EndingId;
  readonly name: string;
  readonly narrative: string;
  readonly priority: number;
  /** All conditions must hold, in the context of ordered ending evaluation. */
  readonly conditions: readonly Condition[];
}

export interface GradeDefinition {
  readonly grade: TeamGrade;
  readonly min: number;
  readonly max: number;
}

export interface AchievementDefinition {
  readonly id: SpecialAchievement;
  readonly name: string;
  readonly conditions: readonly Condition[];
}
