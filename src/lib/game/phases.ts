import type { RoundNumber } from "@/types";
import { reject } from "./errors";
import { requirePhase } from "./guards";
import { enterRedlineDraft } from "./redline";
import { startRoundDraft } from "./rounds";
import type { CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";
import { command } from "./transaction";

export function startGame(state: EngineState, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "lobby");
    if (draft.status !== "waiting") reject("INVALID_PHASE", "Only a waiting game can start.");
    draft.status = "active"; draft.phase = "briefing"; draft.startedAt = context.occurredAt;
    record(draft, context, "game_start", "BLACKOUT initiated.");
  });
}

/** Explicit server commands advance phases; no timers or arbitrary target phases. */
export function advancePhase(state: EngineState, context: CommandContext) {
  return command(state, context, draft => {
    switch (draft.phase) {
      case "briefing":
        draft.phase = "mission_intro";
        record(draft, context, "briefing_completed", "All operator briefings acknowledged. Mission intro ready.");
        break;
      case "mission_intro": startRoundDraft(draft, 1, context); break;
      case "round_intro": draft.phase = "discussion"; break;
      case "discussion":
        if (draft.round === 5) enterRedlineDraft(draft, context);
        else draft.phase = "response_selection";
        break;
      case "consequence":
        if (!draft.round || draft.round === 5) reject("INVALID_ROUND", "No next normal round.");
        startRoundDraft(draft, (draft.round + 1) as RoundNumber, context); break;
      default: reject("INVALID_PHASE", "This phase requires a specific authoritative command.");
    }
  });
}
