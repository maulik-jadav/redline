import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { CanonicalResponseId, ResponseDefinition } from "@/data/blackout";
import type { EvidenceKey, PlayerId } from "@/types";
import { reject } from "./errors";
import { publishDraft, unlockCorrelationDraft } from "./evidence";
import { normalRound } from "./guards";
import { applyEffectsDraft } from "./metrics";
import type { CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";

export function canonicalResponse(state: EngineState, id: CanonicalResponseId): ResponseDefinition<CanonicalResponseId> {
  const responses: Partial<Record<CanonicalResponseId, ResponseDefinition<CanonicalResponseId>>> = BLACKOUT_SCENARIO.rounds[normalRound(state)].responses;
  const response = responses[id];
  if (!response || !Object.hasOwn(responses, id)) reject("INVALID_PROPOSAL", "Response does not belong to the current round.");
  return response;
}

export function executeCanonicalDraft(state: EngineState, id: CanonicalResponseId, publisher: PlayerId,
  evidence: readonly EvidenceKey[], participants: readonly PlayerId[], context: CommandContext): void {
  const response = canonicalResponse(state, id);
  if (state.executedResponses.includes(id)) reject("INVALID_PROPOSAL", "Response already executed.");
  if (response.kind === "public_disclosure") publishDraft(state, publisher, evidence, participants, context);
  else {
    applyEffectsDraft(state, response.effects);
    if (response.flags) Object.assign(state.scenarioFlags, response.flags);
    if (response.suppressionExposure) state.suppressionEvidence = Object.values(state.evidence)
      .filter(item => item.verification === "confirmed" && item.visibility !== "private").map(item => item.key);
  }
  state.executedResponses.push(id);
  unlockCorrelationDraft(state, context);
  record(state, context, "decision_executed", response.title, publisher, { responseId: id });
}
