import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { IntelDefinition } from "@/data/blackout";
import { PLAYER_ROLES } from "@/types";
import type { EvidenceKey, MetricEffects, PlayerRole, RoundNumber } from "@/types";
import { matchesConditions } from "./conditions";
import { discoverAutomaticDraft } from "./evidence";
import { reject } from "./errors";
import { requirePhase } from "./guards";
import { applyEffectsDraft, roundHalfAwayFromZero } from "./metrics";
import type { CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";
import { command } from "./transaction";

export function startRoundDraft(state: EngineState, round: RoundNumber, context: CommandContext): void {
  requirePhase(state, "mission_intro", "consequence");
  if (round !== (state.round ?? 0) + 1 || !Object.hasOwn(BLACKOUT_SCENARIO.rounds, round) ||
    (state.round !== undefined && !state.resolvedRounds.includes(state.round))) reject("INVALID_ROUND", "Round must follow the completed prior round.");
  const definition = BLACKOUT_SCENARIO.rounds[round];
  state.round = round; state.phase = "round_intro";
  delete state.selectedProposalId;
  let effects: MetricEffects = "baseEffects" in definition ? definition.baseEffects : {};
  let description: string = definition.publicEvent.description;
  if (definition.round === 2) {
    const variant = Object.values(definition.severity.variants).find(variant => matchesConditions(state, variant.conditions));
    if (!variant) reject("INVALID_INPUT", "No hospital severity matches the current risk.");
    effects = variant.effects; description = variant.narrative;
  } else if (definition.round === 5) {
    const variant = Object.values(definition.severity.variants).find(variant => matchesConditions(state, variant.conditions));
    if (!variant) reject("INVALID_INPUT", "No system-failure severity matches the current risk.");
    effects = Object.fromEntries(Object.entries(definition.baseEffects).map(([key, value]) => [key, roundHalfAwayFromZero(value * variant.multiplier)]));
  }
  applyEffectsDraft(state, effects);
  Object.assign(state.map.sectors, definition.mapChanges.sectors);
  if ("transit" in definition.mapChanges) state.map.transit = definition.mapChanges.transit;
  const eventId = `${context.commandId}:event:round`;
  state.activeEventId = eventId;
  state.events.push({ id: eventId, roomId: state.roomId, round, type: "round_event",
    severity: definition.publicEvent.severity, headline: definition.publicEvent.headline, description, metricEffects: { ...effects } });
  discoverAutomaticDraft(state, context);
  const intelByRole: Partial<Record<PlayerRole, IntelDefinition>> = definition.privateIntel;
  for (const role of PLAYER_ROLES) {
    const intel = intelByRole[role];
    if (!intel) continue;
    const evidenceKey = (Object.keys(state.evidence) as EvidenceKey[]).find(key =>
      state.evidence[key]?.description === intel.text && state.evidence[key]?.ownerPlayerId === state.roleAssignments[role]);
    state.privateIntel.push({ ...structuredClone(intel), id: `${context.commandId}:intel:${role}`,
      ownerPlayerId: state.roleAssignments[role], round, visibility: "private", ...(evidenceKey ? { evidenceKey } : {}) });
  }
  if (definition.round === 5) for (const [index, message] of definition.npcMessages.entries()) {
    // The ORACLE template stays a template; this engine does not invent risk estimates.
    state.events.push({ id: `${context.commandId}:event:npc:${index}`, roomId: state.roomId, round,
      type: "npc_message", severity: "warning", headline: message.headline, description: message.description });
  }
  record(state, context, "round_start", definition.publicEvent.headline);
}

export function startRound(state: EngineState, input: { round: RoundNumber }, context: CommandContext) {
  return command(state, context, draft => startRoundDraft(draft, input.round, context));
}
