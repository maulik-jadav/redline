import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { EvidenceDefinition, EvidenceRequirement } from "@/data/blackout";
import type { EvidenceKey, PlayerId } from "@/types";
import { rewardDraft } from "./collaboration";
import { reject } from "./errors";
import { requireInteraction, requirePlayer } from "./guards";
import { applyEffectsDraft } from "./metrics";
import type { CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";
import { command } from "./transaction";

export function hasEvidence(state: EngineState, requirement: EvidenceRequirement): boolean {
  const evidence = state.evidence[requirement.key];
  return !!evidence && evidence.verification === requirement.verification &&
    requirement.visibility.some(visibility => visibility === evidence.visibility);
}

export function discoverDraft(state: EngineState, key: EvidenceKey, context: CommandContext): boolean {
  if (state.evidence[key]) return false;
  const definition: EvidenceDefinition = BLACKOUT_SCENARIO.evidence[key];
  state.evidence[key] = {
    id: `${context.commandId}:evidence:${key}`, roomId: state.roomId, key,
    title: definition.title, description: definition.content,
    visibility: definition.visibility, verification: definition.verification,
    ...(definition.ownerRole ? { ownerPlayerId: state.roleAssignments[definition.ownerRole] } : {}),
    ...(state.round ? { discoveredRound: state.round } : {}),
  };
  return true;
}

export function discoverAutomaticDraft(state: EngineState, context: CommandContext): void {
  for (const definition of Object.values(BLACKOUT_SCENARIO.evidence) as EvidenceDefinition[]) {
    const discovery = definition.discovery;
    const eligible = (discovery.kind === "early_intelligence" && state.round === definition.earliestDiscoveryRound) ||
      (discovery.kind === "automatic" && state.round === discovery.round) ||
      (discovery.kind === "conditional_automatic" && state.round === discovery.round && !hasEvidence(state, discovery.unlessEvidence));
    if (eligible) discoverDraft(state, definition.key, context);
  }
}

export function unlockCorrelationDraft(state: EngineState, context: CommandContext): void {
  const key = "failure_correlation_analysis";
  if (state.evidence[key]) return;
  const rule = BLACKOUT_SCENARIO.evidence[key].discovery;
  const matches = rule.paths.some(path => path.kind === "all_evidence"
    ? path.evidence.every(requirement => hasEvidence(state, requirement))
    : state.executedResponses.includes(path.responseId) && path.evidence.some(requirement => hasEvidence(state, requirement)));
  if (!matches) return;
  discoverDraft(state, key, context);
  Object.assign(state.scenarioFlags, rule.flags);
  record(state, context, "intelligence_shared", BLACKOUT_SCENARIO.evidence[key].title, undefined, { evidenceKeys: [key] });
}

export function shareEvidenceDraft(state: EngineState, playerId: PlayerId, key: EvidenceKey, context: CommandContext): void {
  requirePlayer(state, playerId);
  const evidence = state.evidence[key];
  if (!evidence || evidence.ownerPlayerId !== playerId) reject("EVIDENCE_UNAVAILABLE", "Private evidence is not owned by this player.");
  if (evidence.visibility !== "private") reject("EVIDENCE_ALREADY_SHARED", "Evidence cannot return to an earlier visibility.");
  evidence.visibility = "shared";
  for (const intel of state.privateIntel) if (intel.evidenceKey === key) intel.visibility = "shared";
  rewardDraft(state, "uniqueIntelligenceShared", key, playerId);
  if (evidence.verification === "confirmed") rewardDraft(state, "confirmedEvidenceShared", key, playerId);
  record(state, context, "intelligence_shared", `${evidence.title} shared with the room.`, playerId, { evidenceKeys: [key] });
  unlockCorrelationDraft(state, context);
}

export function shareEvidence(state: EngineState, input: { playerId: PlayerId; evidenceKey: EvidenceKey }, context: CommandContext) {
  return command(state, context, draft => {
    requireInteraction(draft);
    shareEvidenceDraft(draft, input.playerId, input.evidenceKey, context);
  });
}

export function shareIntelligence(state: EngineState, input: { playerId: PlayerId; intelId: string }, context: CommandContext) {
  return command(state, context, draft => {
    requireInteraction(draft); requirePlayer(draft, input.playerId);
    const intel = draft.privateIntel.find(intel => intel.id === input.intelId && intel.ownerPlayerId === input.playerId);
    if (!intel) reject("EVIDENCE_UNAVAILABLE", "Intelligence is not owned by this player.");
    if (intel.evidenceKey) return shareEvidenceDraft(draft, input.playerId, intel.evidenceKey, context);
    if (intel.visibility !== "private") reject("EVIDENCE_ALREADY_SHARED", "Intelligence already shared.");
    intel.visibility = "shared";
    rewardDraft(draft, "uniqueIntelligenceShared", intel.id, input.playerId);
    record(draft, context, "intelligence_shared", "Private intelligence shared with the room.", input.playerId);
  });
}

/** Validate before voting locks the selection as well as before publication. */
export function publicationItems(state: EngineState, playerId: PlayerId, keys: readonly EvidenceKey[]) {
  requirePlayer(state, playerId);
  if (!keys.length || keys.some((key, i) => keys.indexOf(key) !== i)) reject("EVIDENCE_UNAVAILABLE", "Select unique discovered evidence.");
  return keys.map(key => {
    const item = state.evidence[key];
    if (!item || (item.visibility === "private" && item.ownerPlayerId !== playerId) || item.verification === "contradicted") {
      reject("EVIDENCE_UNAVAILABLE", "Evidence is unavailable to this publisher.");
    }
    if (item.visibility === "public") reject("EVIDENCE_ALREADY_SHARED", "Evidence is already public.");
    return item;
  });
}

/** Only canonical decision and Breaking Leak call this internal draft helper. */
export function publishDraft(state: EngineState, playerId: PlayerId, keys: readonly EvidenceKey[],
  participants: readonly PlayerId[], context: CommandContext): void {
  const items = publicationItems(state, playerId, keys);
  const policy = BLACKOUT_SCENARIO.disclosure;
  const categories = Object.values(policy.categories);
  const category = categories.filter(category => items.some(item =>
    item.verification === category.verification &&
    (!("qualifyingEvidence" in category) || category.qualifyingEvidence.some(key => key === item.key)) &&
    // Confirmed non-Helix is the remaining confirmed category.
    (category !== policy.categories.confirmed_non_helix || !policy.categories.confirmed_helix_wrongdoing.qualifyingEvidence.some(key => key === item.key))
  )).sort((a, b) => a.priority - b.priority)[0];
  if (!category) reject("EVIDENCE_UNAVAILABLE", "No canonical disclosure consequence applies.");
  const wasExposed = state.scenarioFlags.helixExposed;
  for (const item of items) item.visibility = "public";
  for (const intel of state.privateIntel) if (intel.evidenceKey && keys.includes(intel.evidenceKey)) intel.visibility = "public";
  applyEffectsDraft(state, category.effects);
  if ("flags" in category) Object.assign(state.scenarioFlags, category.flags);
  record(state, context, "public_disclosure", "Selected evidence published.", playerId,
    { evidenceKeys: [...keys], participantIds: [...participants] });
  if (!wasExposed && state.scenarioFlags.helixExposed) {
    rewardDraft(state, "confirmedWrongdoingPublished", "global", playerId);
    record(state, context, "helix_exposed", "Confirmed evidence of Helix's prior knowledge made public.", playerId);
  }
  if (state.scenarioFlags.informationSuppressed && !state.scenarioFlags.suppressionExposed &&
    keys.some(key => state.suppressionEvidence.includes(key))) {
    applyEffectsDraft(state, BLACKOUT_SCENARIO.suppressionExposure.effects);
    Object.assign(state.scenarioFlags, BLACKOUT_SCENARIO.suppressionExposure.flags);
    record(state, context, "suppression_exposed", "Previously suppressed confirmed evidence made public.", playerId);
  }
  unlockCorrelationDraft(state, context);
}
