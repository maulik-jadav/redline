import "server-only";
import { authorizePlayerSession,hashSessionToken } from "@/lib/supabase/sessions";
import type { PlayerCredential } from "@/lib/supabase/sessions";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import { loadGameState } from "@/lib/supabase/repositories/game-state";
import { lobbyFailure,rpcFailure } from "@/lib/rooms/errors";
import { commandFailure } from "./errors";
export async function gameContext(db:ServerDatabaseClient,code:string,credential:PlayerCredential,options:{fullGame?:boolean}={}) {
  await authorizePlayerSession(db,credential);
  const {data:members,error}=await db.rpc("get_crisis_members",{p_code:code,p_player_id:credential.playerId,p_token_hash:hashSessionToken(credential.token)});
  if(error)rpcFailure(error);if(!members)commandFailure("ACCESS_DENIED");
  const state=await loadGameState(db,credential.roomId);
  const self=members.find(player=>player.id===credential.playerId);
  if(!state||(!options.fullGame?state.status!=="active":!["active","completed"].includes(state.status))||!self?.role||state.roleAssignments[self.role]!==credential.playerId)commandFailure("ACCESS_DENIED");
  if(!options.fullGame&&state.round!==undefined&&state.round!==1)commandFailure("ROUND_ONE_COMPLETE");
  if(!["mission_intro","round_intro","discussion","response_selection","voting","consequence",...(options.fullGame?["redline_protocol","results"]:[])].includes(state.phase))lobbyFailure("BRIEFING_UNAVAILABLE");
  return {state,members,self};
}
