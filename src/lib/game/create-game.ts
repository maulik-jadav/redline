import { BLACKOUT_SCENARIO } from "@/data/blackout";
import { PLAYER_ROLES } from "@/types";
import type { GameMode, PlayerId, PlayerRole, RoleAbility, RoleAbilityId, RoomId } from "@/types";
import { reject } from "./errors";
import { validId } from "./guards";
import type { EngineState } from "./runtime";

export function createGame(input: { roomId: RoomId; mode: GameMode; roleAssignments: Record<PlayerRole, PlayerId> }): EngineState {
  validId(input.roomId);
  if (!Object.hasOwn(BLACKOUT_SCENARIO.timings, input.mode)) reject("INVALID_INPUT", "Unknown mode.");
  const players = PLAYER_ROLES.map(role => input.roleAssignments[role]);
  players.forEach(validId);
  if (players.some((id, i) => players.indexOf(id) !== i)) reject("INVALID_PLAYER", "Four distinct assigned players are required.");
  const abilities = Object.fromEntries(Object.values(BLACKOUT_SCENARIO.abilities).map(ability => [ability.id, {
    id: ability.id, ownerRole: ability.ownerRole, maxUses: ability.maxUses, remainingUses: ability.maxUses,
  }])) as Record<RoleAbilityId, RoleAbility>;
  return {
    roomId: input.roomId, scenarioId: BLACKOUT_SCENARIO.metadata.id, mode: input.mode,
    status: "waiting", phase: "lobby", version: 0,
    ...structuredClone(BLACKOUT_SCENARIO.initialState),
    roleAssignments: { ...input.roleAssignments }, map: structuredClone(BLACKOUT_SCENARIO.map.initialState),
    proposals: {}, votes: {}, evidence: {}, privateIntel: [], abilities, events: [], timeline: [],
    resolvedRounds: [], executedResponses: [], suppressionEvidence: [], collaborationRewards: [],
    contributions: Object.fromEntries(players.map(id => [id, 0])), processedCommands: [], redlineSelections: {},
  };
}
