import { isEngineError, reject } from "./errors";
import type { EngineResult } from "./errors";
import { validId } from "./guards";
import type { CommandContext, EngineState } from "./runtime";

/** Internal helpers mutate only this isolated draft. Commit/version happens here once. */
export function command(state: EngineState, context: CommandContext, apply: (draft: EngineState) => void): EngineResult {
  try {
    if (context.expectedVersion !== undefined && context.expectedVersion !== state.version) reject("VERSION_CONFLICT", "Stale game version.");
    if (state.status === "completed") reject("GAME_ALREADY_COMPLETED", "Game is already completed.");
    validId(context.commandId);
    if (!Number.isFinite(Date.parse(context.occurredAt))) reject("INVALID_INPUT", "A valid supplied timestamp is required.");
    if (state.processedCommands.includes(context.commandId)) reject("COMMAND_ALREADY_APPLIED", "Command already applied.");
    const draft = structuredClone(state);
    apply(draft);
    draft.version = state.version + 1;
    draft.processedCommands.push(context.commandId);
    return { ok: true, state: draft };
  } catch (error) {
    if (isEngineError(error)) return { ok: false, error };
    throw error;
  }
}
