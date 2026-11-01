import "server-only";
import { NextResponse } from "next/server";
import { publicLobbyError } from "@/lib/rooms/errors";
const messages={AI_ANALYSIS_OFFLINE:"CUSTOM COMMAND ANALYSIS OFFLINE — Canonical response protocols remain available.",INVALID_COMMAND:"This command could not be verified.",INVALID_PHASE:"This command is unavailable in the current phase.",INVALID_PLAYER:"This operator is not authorized for that command.",INVALID_ROLE:"This authorization belongs to another role.",INVALID_PROPOSAL:"This proposal is no longer eligible, or you already have an active proposal.",INVALID_VOTE:"This vote cannot be recorded.",ALREADY_VOTED:"VOTE ALREADY RECORDED — Normal votes cannot change.",ABILITY_EXHAUSTED:"No ability uses remain.",ABILITY_UNAVAILABLE:"This ability is unavailable in the current phase or round.",EVIDENCE_UNAVAILABLE:"That intelligence is not available to this operator.",EVIDENCE_ALREADY_SHARED:"That intelligence has already been shared.",STATE_CHANGED:"STATE CHANGED — Command center synchronized to latest state.",PHASE_EXPIRED:"The phase deadline has passed. Synchronizing command center.",ROUND_ONE_COMPLETE:"Round 1 is complete. Awaiting the next crisis phase.",ACCESS_DENIED:"Crisis access requires an assigned, acknowledged operator."} as const;
export type GameServerCode=keyof typeof messages;
export function commandFailure(code:GameServerCode):never {throw Object.assign(new Error(messages[code]),{code});}
export function gameError(error:unknown) {
  const candidate=typeof error==="object"&&error!==null&&"code"in error?String(error.code):"";
  const code=candidate==="VERSION_CONFLICT"?"STATE_CHANGED":candidate;
  if(Object.hasOwn(messages,code))return {ok:false as const,code,message:messages[code as GameServerCode]};
  return publicLobbyError(error);
}
export function gameErrorResponse(error:unknown) {
  const data=gameError(error);
  return NextResponse.json(data,{status:data.code==="SERVICE_UNAVAILABLE"?503:data.code==="INVALID_SESSION"||data.code==="ACCESS_DENIED"?401:409,headers:{"Cache-Control":"no-store"}});
}
