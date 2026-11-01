import type { Condition } from "@/data/blackout";
import type { GameState } from "@/types";

export function matchesConditions(state: GameState, conditions: readonly Condition[]): boolean {
  return conditions.every(condition => {
    if (condition.kind === "flag") return state.scenarioFlags[condition.flag] === condition.value;
    const value = condition.metric === "cascadeRisk" ? state.hiddenMetrics.cascadeRisk : state.metrics[condition.metric];
    switch (condition.operator) {
      case "lt": return value < condition.value;
      case "lte": return value <= condition.value;
      case "gte": return value >= condition.value;
    }
  });
}
