import type { GameMode, GameStatus } from "./game";

/** Explicit allowlist for browser delivery; no roles, sessions, or engine data. */
export interface LobbyView {
  code: string;
  mode: GameMode;
  status: GameStatus;
  selfPlayerId: string;
  players: { id: string; displayName: string; isHost: boolean; isReady: boolean }[];
}

export type LobbyErrorCode = "INVALID_REQUEST" | "INVALID_CALLSIGN" | "INVALID_ROOM_CODE" |
  "ROOM_NOT_FOUND" | "ROOM_FULL" | "CALLSIGN_TAKEN" | "ROOM_IN_PROGRESS" | "INVALID_SESSION" |
  "SERVICE_UNAVAILABLE" | "ROOM_CREATE_FAILED" | "NOT_HOST" | "ROOM_NOT_FULL" | "PLAYERS_NOT_READY" |
  "ROOM_ALREADY_STARTED" | "ROOM_NOT_STARTED" | "BRIEFING_UNAVAILABLE" | "CRISIS_ACTIVE";

export type LobbyApiResult<T> = { ok: true; data: T } | { ok: false; code: LobbyErrorCode; message: string };
