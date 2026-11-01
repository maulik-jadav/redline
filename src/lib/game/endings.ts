import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { EndingId, GameState } from "@/types";
import { matchesConditions } from "./conditions";
import { reject } from "./errors";

export function evaluateEnding(state: GameState): EndingId {
  const ending = Object.values(BLACKOUT_SCENARIO.endings).sort((a, b) => a.priority - b.priority)
    .find(ending => matchesConditions(state, ending.conditions));
  if (!ending) reject("INVALID_INPUT", "No ending covers this state; metrics must be bounded.");
  return ending.id;
}
