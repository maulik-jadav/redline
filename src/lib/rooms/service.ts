import "server-only";
import { randomUUID } from "node:crypto";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import { authorizePlayerSession, hashSessionToken } from "@/lib/supabase/sessions";
import type { PlayerCredential } from "@/lib/supabase/sessions";
import type { LobbyView } from "@/types/lobby";
import type { EntryInput } from "./validation";
import { credentialForRequest, generateRoomCode, requestFingerprint } from "./identity";
import { lobbyFailure, rpcFailure } from "./errors";

export async function enterRoom(db:ServerDatabaseClient,input:EntryInput,seed:string,codeGenerator=generateRoomCode) {
  const token=credentialForRequest(seed,input.requestId);
  const tokenHash=hashSessionToken(token);
  const fingerprint=requestFingerprint(input);
  for(let attempt=0;attempt<5;attempt++) {
    const {data,error}=await db.rpc("enter_lobby",{p_request_id:input.requestId,p_fingerprint:fingerprint,p_token_hash:tokenHash,
      p_operation:input.operation,p_room_id:randomUUID(),p_player_id:randomUUID(),p_callsign:input.callsign,
      p_code:input.operation==="create"?codeGenerator():input.roomCode,p_mode:input.operation==="create"?input.mode:null});
    if(error?.message==="ROOM_CODE_COLLISION"&&input.operation==="create")continue;
    if(error)rpcFailure(error);
    if(!data)lobbyFailure("SERVICE_UNAVAILABLE");
    return {code:data.code,credential:{roomId:data.room_id,playerId:data.player_id,token} satisfies PlayerCredential};
  }
  lobbyFailure("ROOM_CREATE_FAILED");
}

export async function getLobbyForMember(db:ServerDatabaseClient,code:string,credential:PlayerCredential):Promise<LobbyView> {
  await authorizePlayerSession(db,credential);
  const {data,error}=await db.rpc("get_lobby_snapshot",{p_code:code,p_player_id:credential.playerId,p_token_hash:hashSessionToken(credential.token)});
  if(error)rpcFailure(error);if(!data)lobbyFailure("INVALID_SESSION");
  // The RPC independently verifies that the player belongs to this exact code.
  return data;
}

export async function updateLobbyMember(db:ServerDatabaseClient,credential:PlayerCredential,input:{action:"ready";ready:boolean}|{action:"leave"}):Promise<void> {
  await authorizePlayerSession(db,credential);
  const {error}=await db.rpc("update_lobby_member",{p_room_id:credential.roomId,p_player_id:credential.playerId,
    p_token_hash:hashSessionToken(credential.token),p_action:input.action,p_ready:input.action==="ready"?input.ready:null});
  if(error)rpcFailure(error);
}
