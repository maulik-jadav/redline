import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { checkDatabaseError, persistenceFailure } from "./errors";
import type { ServerDatabaseClient } from "./server";

export interface PlayerCredential { roomId: string; playerId: string; token: string }
export interface AuthorizedPlayer { readonly roomId: string; readonly playerId: string }

export function assertUuid(value: string): void {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) persistenceFailure("INVALID_ID","A UUID is required.");
}

/** Tokens must be generated from 32 random bytes by a future server flow.
 * SHA-256 is appropriate for high-entropy tokens, not user-selected passwords.
 */
export function hashSessionToken(token: string): string {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) persistenceFailure("INVALID_SESSION","Invalid session credential.");
  return createHash("sha256").update(token,"utf8").digest("hex");
}

export function verifySessionToken(token: string, hash: string): boolean {
  if(!/^[a-f0-9]{64}$/.test(hash)) return false;
  try { return timingSafeEqual(Buffer.from(hashSessionToken(token),"hex"),Buffer.from(hash,"hex")); }
  catch { return false; }
}

export async function authorizePlayerSession(db: ServerDatabaseClient, credential: PlayerCredential): Promise<AuthorizedPlayer> {
  assertUuid(credential.roomId); assertUuid(credential.playerId);
  // Fail before querying if the credential format is invalid.
  hashSessionToken(credential.token);
  const {data,error}=await db.from("player_sessions").select("token_hash,revoked_at")
    .eq("room_id",credential.roomId).eq("player_id",credential.playerId).maybeSingle();
  checkDatabaseError(error);
  if(!data || data.revoked_at !== null || !verifySessionToken(credential.token,data.token_hash)) persistenceFailure("INVALID_SESSION","Invalid session credential.");
  return {roomId:credential.roomId,playerId:credential.playerId};
}

export async function storePlayerSession(db: ServerDatabaseClient, credential: PlayerCredential): Promise<void> {
  assertUuid(credential.roomId); assertUuid(credential.playerId);
  const {error}=await db.from("player_sessions").insert({room_id:credential.roomId,player_id:credential.playerId,token_hash:hashSessionToken(credential.token)});
  checkDatabaseError(error);
}
