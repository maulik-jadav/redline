import type { LobbyApiResult, LobbyErrorCode } from "@/types/lobby";

const messages:Record<LobbyErrorCode,string>={
  NOT_HOST:"Only the room host can initiate the crisis.", ROOM_NOT_FULL:"Four active operators are required.",
  PLAYERS_NOT_READY:"All four operators must be ready.", ROOM_ALREADY_STARTED:"This crisis has already been initiated.",
  ROOM_NOT_STARTED:"The crisis has not been initiated yet.", BRIEFING_UNAVAILABLE:"Your classified briefing is unavailable.",
  CRISIS_ACTIVE:"You cannot leave the operator roster after initiation.",
  INVALID_REQUEST:"The request could not be verified. Refresh and try again.",
  INVALID_CALLSIGN:"Use 2–20 letters, numbers, spaces, underscores or hyphens.",
  INVALID_ROOM_CODE:"Enter a valid room code.",ROOM_NOT_FOUND:"That crisis room could not be found.",
  ROOM_FULL:"This crisis room already has four operators.",CALLSIGN_TAKEN:"That callsign is already in use in this room.",
  ROOM_IN_PROGRESS:"This room is no longer accepting lobby changes.",INVALID_SESSION:"Your session has ended. Join the room again.",
  SERVICE_UNAVAILABLE:"Room services are unavailable. Try again shortly.",ROOM_CREATE_FAILED:"A room code could not be reserved. Please try again.",
};
export function lobbyFailure(code:LobbyErrorCode):never {throw Object.assign(new Error(messages[code]),{code});}
export function publicLobbyError(error:unknown):Extract<LobbyApiResult<never>,{ok:false}> {
  const code=typeof error==="object"&&error!==null&&"code" in error&&typeof error.code==="string"&&Object.hasOwn(messages,error.code)
    ? error.code as LobbyErrorCode : "SERVICE_UNAVAILABLE";
  return {ok:false,code,message:messages[code]};
}
export function rpcFailure(error:{message:string}):never {
  const code=(Object.keys(messages) as LobbyErrorCode[]).find(code=>error.message===code || error.message.startsWith(`${code}:`));
  lobbyFailure(code ?? "SERVICE_UNAVAILABLE");
}
