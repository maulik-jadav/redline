import type { EventId, RoomId, RoundNumber } from "./common";
import type { MetricEffects } from "./metrics";

export type EventSeverity = "info" | "warning" | "critical";

export type GameEventType =
  | "round_event"
  | "critical_event"
  | "decision"
  | "system"
  | "npc_message"
  | "broadcast";

/** Recorded event data; descriptions never supersede authoritative engine state. */
export interface GameEvent {
  readonly id: EventId;
  readonly roomId: RoomId;
  round?: RoundNumber;
  type: GameEventType;
  severity: EventSeverity;
  headline: string;
  description: string;
  metricEffects?: MetricEffects;
}
