import { PLAYER_ROLES } from "@/types";
import type { GamePhase, PlayerId, PlayerRole } from "@/types";
import type { NormalRoundNumber } from "@/data/blackout";
import { reject } from "./errors";
import type { EngineState } from "./runtime";

export function requirePhase(state: EngineState, ...phases: GamePhase[]): void {
  if (!phases.includes(state.phase)) reject("INVALID_PHASE", `Operation is unavailable during ${state.phase}.`);
}

export function requirePlayer(state: EngineState, playerId: PlayerId): PlayerRole {
  const role = PLAYER_ROLES.find(role => state.roleAssignments[role] === playerId);
  if (!role) reject("INVALID_PLAYER", "Player is not assigned to this game.");
  return role;
}

export function normalRound(state: EngineState): NormalRoundNumber {
  const round = state.round;
  if (round === undefined || round === 5) reject("INVALID_ROUND", "Normal proposals require Round 1–4.");
  return round;
}

export function validId(id: string): void {
  if (typeof id !== "string" || !id.trim() || ["__proto__", "constructor", "prototype"].includes(id)) reject("INVALID_INPUT", "Invalid identifier.");
}

export function requireInteraction(state: EngineState): void {
  requirePhase(state, "discussion", "response_selection");
}
