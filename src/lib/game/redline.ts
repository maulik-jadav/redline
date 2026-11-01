import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { PlayerId, RedlineChoice } from "@/types";
import { rewardDraft } from "./collaboration";
import { reject } from "./errors";
import { requirePhase, requirePlayer } from "./guards";
import { applyEffectsDraft } from "./metrics";
import type { CommandContext, EngineState } from "./runtime";
import { buildGameResult } from "./scoring";
import { record } from "./timeline";
import { command } from "./transaction";

export function enterRedlineDraft(state: EngineState, context: CommandContext): void {
  requirePhase(state, "discussion");
  if (state.round !== 5) reject("INVALID_ROUND", "REDLINE follows Round 5 discussion.");
  state.phase = "redline_protocol";
  record(state, context, "redline_activated", BLACKOUT_SCENARIO.redline.activation.headline);
}

function completeDraft(state: EngineState, resolution: RedlineChoice | "deadlock", context: CommandContext): void {
  if (state.redlineResolution) reject("INVALID_REDLINE_SELECTION", "REDLINE already resolved.");
  if (resolution === "deadlock") applyEffectsDraft(state, BLACKOUT_SCENARIO.redline.deadlock.effects);
  else {
    const option = BLACKOUT_SCENARIO.redline.options[resolution];
    applyEffectsDraft(state, option.kind === "fixed" ? option.effects : state.scenarioFlags[option.flag] ? option.whenTrue : option.whenFalse);
  }
  state.redlineResolution = resolution;
  state.resolvedRounds.push(5); state.status = "completed"; state.phase = "results"; state.completedAt = context.occurredAt;
  record(state, context, "final_vote", resolution === "deadlock" ? BLACKOUT_SCENARIO.redline.deadlock.headline : BLACKOUT_SCENARIO.redline.options[resolution].name);
  state.result = buildGameResult(state);
  record(state, context, "ending", BLACKOUT_SCENARIO.endings[state.result.ending].name);
}

export function enterRedlineProtocol(state: EngineState, context: CommandContext) {
  return command(state, context, draft => enterRedlineDraft(draft, context));
}

export function submitRedlineSelection(state: EngineState, input: { playerId: PlayerId; choice: RedlineChoice }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "redline_protocol"); requirePlayer(draft, input.playerId);
    if (!Object.hasOwn(BLACKOUT_SCENARIO.redline.options, input.choice) || draft.redlineResolution) reject("INVALID_REDLINE_SELECTION", "Selection is invalid or voting has closed.");
    draft.redlineSelections[input.playerId] = input.choice;
    rewardDraft(draft, "voteParticipation", JSON.stringify(["redline", input.playerId]), input.playerId);
    if (Object.values(draft.redlineSelections).filter(choice => choice === input.choice).length >= BLACKOUT_SCENARIO.redline.ballot.requiredVotes) {
      completeDraft(draft, input.choice, context);
    }
  });
}

export function finalizeRedlineDeadlock(state: EngineState, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "redline_protocol");
    if (Object.keys(BLACKOUT_SCENARIO.redline.options).some(choice => Object.values(draft.redlineSelections)
      .filter(selection => selection === choice).length >= BLACKOUT_SCENARIO.redline.ballot.requiredVotes)) reject("INVALID_REDLINE_SELECTION", "A winning selection exists.");
    completeDraft(draft, "deadlock", context);
  });
}
