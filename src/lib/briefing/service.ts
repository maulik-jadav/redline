import "server-only";
import { z } from "zod";
import { createGame, startGame, advancePhase } from "@/lib/game";
import { BLACKOUT_ROLES } from "@/data/blackout/roles";
import type { RoleDefinition, Condition } from "@/data/blackout/config";
import { loadGameState } from "@/lib/supabase/repositories/game-state";
import { toPersistenceSnapshot } from "@/lib/supabase/mapping";
import { authorizePlayerSession, hashSessionToken } from "@/lib/supabase/sessions";
import type { PlayerCredential } from "@/lib/supabase/sessions";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import { getLobbyForMember } from "@/lib/rooms/service";
import { lobbyFailure, rpcFailure } from "@/lib/rooms/errors";
import type { BriefingContext, PrivateBriefing } from "@/types/briefing";
import { assignRoles } from "./assignment";

export const startSchema=z.object({commandId:z.uuid()}).strict();
export const acknowledgeSchema=z.object({action:z.literal("acknowledge")}).strict();
export async function initiateCrisis(db:ServerDatabaseClient,code:string,credential:PlayerCredential,commandId:string,occurredAt=new Date().toISOString()) {
  const lobby=await getLobbyForMember(db,code,credential);
  const self=lobby.players.find(player=>player.id===credential.playerId);
  if(!self?.isHost)lobbyFailure("NOT_HOST");
  if(lobby.status!=="waiting")lobbyFailure("ROOM_ALREADY_STARTED");
  if(lobby.players.length!==4)lobbyFailure("ROOM_NOT_FULL");
  if(!lobby.players.every(player=>player.isReady))lobbyFailure("PLAYERS_NOT_READY");
  const assignments=assignRoles(credential.roomId,commandId,lobby.players);
  const initial=createGame({roomId:credential.roomId,mode:lobby.mode,roleAssignments:assignments});
  const result=startGame(initial,{commandId,occurredAt,expectedVersion:0});
  if(!result.ok)lobbyFailure("SERVICE_UNAVAILABLE");
  const {error}=await db.rpc("initiate_crisis",{p_room_id:credential.roomId,p_player_id:credential.playerId,
    p_token_hash:hashSessionToken(credential.token),p_command_id:commandId,
    p_initial:toPersistenceSnapshot(initial,occurredAt),p_started:toPersistenceSnapshot(result.state,occurredAt)});
  if(error)rpcFailure(error);
}
export async function getBriefingContext(db:ServerDatabaseClient,code:string,credential:PlayerCredential):Promise<BriefingContext> {
  await authorizePlayerSession(db,credential);
  const {data,error}=await db.rpc("get_briefing_context",{p_code:code,p_player_id:credential.playerId,p_token_hash:hashSessionToken(credential.token)});
  if(error)rpcFailure(error);if(!data)lobbyFailure("BRIEFING_UNAVAILABLE");return data;
}
function describeCondition(condition:Condition):string {
  if(condition.kind==="metric") {
    const labels={grid:"Grid Stability",safety:"Public Safety",economy:"Economic Stability",trust:"Public Trust",cascadeRisk:"Cascade Risk"};
    const operators={gte:"at or above",lte:"at or below",lt:"below"};
    return `${labels[condition.metric]} must remain ${operators[condition.operator]} ${condition.value}%.`;
  }
  if(condition.flag==="helixExposed")return "Helix must remain unexposed.";
  if(condition.flag==="trueCauseDiscovered")return "Discover the true cause of the crisis.";
  return `${condition.flag}: ${condition.value}.`;
}
/** Explicit one-role allowlist. This is the only scenario-to-browser boundary. */
export function privateBriefingPayload(context:BriefingContext):PrivateBriefing {
  const role:RoleDefinition=BLACKOUT_ROLES[context.self.role];
  if(!role)lobbyFailure("BRIEFING_UNAVAILABLE");
  return {callsign:context.self.displayName,role:role.role,characterName:role.characterName,title:role.title,
    responsibility:role.publicResponsibility,secret:role.secret,
    objective:{name:role.primaryObjective.name,conditions:role.primaryObjective.conditions.map(describeCondition)},
    ...(role.bonusObjective?{bonus:role.bonusObjective.description}:{}),
    ability:{name:role.ability.name,description:role.ability.description,uses:context.self.uses}};
}
export async function acknowledgeBriefing(db:ServerDatabaseClient,code:string,credential:PlayerCredential,occurredAt=new Date().toISOString()) {
  await getBriefingContext(db,code,credential);
  const state=await loadGameState(db,credential.roomId);
  if(!state||!["briefing","mission_intro"].includes(state.phase))lobbyFailure("BRIEFING_UNAVAILABLE");
  const commandId=`briefing-complete:${credential.roomId}`;
  const result=state.phase==="briefing"?advancePhase(state,{commandId,occurredAt,expectedVersion:state.version}):null;
  if(result&&!result.ok)lobbyFailure("SERVICE_UNAVAILABLE");
  const {error}=await db.rpc("acknowledge_briefing",{p_room_id:credential.roomId,p_player_id:credential.playerId,
    p_token_hash:hashSessionToken(credential.token),p_expected_version:state.version,
    p_next:result?.ok?toPersistenceSnapshot(result.state,occurredAt):null,p_command_id:commandId});
  if(error)rpcFailure(error);
}
