import "server-only";
import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import type { PlayerCredential } from "@/lib/supabase/sessions";
import { credentialSchema } from "./validation";

export const ROOM_CODE_ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateRoomCode():string {return Array.from({length:4},()=>ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join("");}
export function generateIssuanceSeed():string {return randomBytes(32).toString("base64url");}
export function validSeed(seed:string|undefined):seed is string {return !!seed&&/^[A-Za-z0-9_-]{43}$/.test(seed);}
/** Private HttpOnly seed makes retried entry requests reproduce a strong credential. */
export function credentialForRequest(seed:string,requestId:string):string {
  return createHmac("sha256",Buffer.from(seed,"base64url")).update(requestId).digest("base64url");
}
export function requestFingerprint(value:unknown):string {return createHash("sha256").update(JSON.stringify(value)).digest("hex");}
export function encodeCredential(credential:PlayerCredential):string {return `${credential.roomId}.${credential.playerId}.${credential.token}`;}
export function decodeCredential(value:string|undefined):PlayerCredential|null {
  if(!value||value.length>160)return null;
  const [roomId,playerId,token,...extra]=value.split(".");if(extra.length)return null;
  const parsed=credentialSchema.safeParse({roomId,playerId,token});return parsed.success?parsed.data:null;
}
export const cookieOptions={httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*7};
export const ISSUANCE_COOKIE="redline_entry";
export const roomCookieName=(code:string)=>`redline_room_${code}`;
