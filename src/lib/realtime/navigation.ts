import type { LobbyView } from "@/types/lobby";
export function briefingDestination(lobby:Pick<LobbyView,"code"|"status">):string|null {
  return lobby.status==="active"?`/briefing/${lobby.code}`:null;
}
