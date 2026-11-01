import type { PlayerId, TimelineEventType } from "@/types";
import type { CommandContext, EngineState, EngineTimelineEntry } from "./runtime";

/** Internal draft helper; timestamps and ID namespaces always originate with the caller. */
export function record(state: EngineState, context: CommandContext, type: TimelineEventType,
  message: string, playerId?: PlayerId, details: Partial<Pick<EngineTimelineEntry,
    "evidenceKeys" | "participantIds" | "abilityId" | "proposalId" | "responseId">> = {}): void {
  state.timeline.push({
    id: `${context.commandId}:timeline:${state.timeline.length}`, roomId: state.roomId,
    type, message, occurredAt: context.occurredAt,
    ...(state.round === undefined ? {} : { round: state.round }),
    ...(playerId === undefined ? {} : { playerId }), ...details,
  });
}
