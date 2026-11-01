import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { RoleDefinition } from "@/data/blackout";
import { PLAYER_ROLES } from "@/types";
import type { PersonalObjectiveResult } from "@/types";
import { matchesConditions } from "./conditions";
import type { EngineState } from "./runtime";

export function evaluatePersonalObjectives(state: EngineState): PersonalObjectiveResult[] {
  return PLAYER_ROLES.map(role => {
    const definition: RoleDefinition = BLACKOUT_SCENARIO.roles[role];
    const playerId = state.roleAssignments[role];
    const bonus = definition.bonusObjective;
    return {
      playerId, role, objectiveName: definition.primaryObjective.name,
      completed: matchesConditions(state, definition.primaryObjective.conditions),
      ...(bonus?.kind === "publication" ? { bonusCompleted: state.timeline.some(entry =>
        entry.type === "public_disclosure" && entry.evidenceKeys?.includes(bonus.evidence) &&
        state.evidence[bonus.evidence]?.verification === bonus.verification &&
        (entry.playerId === playerId || entry.participantIds?.includes(playerId))) } : {}),
    };
  });
}
