import "server-only";
import type { Database } from "../database.types";
import { checkDatabaseError } from "../errors";
import type { ServerDatabaseClient } from "../server";

export async function getRoomById(db: ServerDatabaseClient,id:string) {
  const {data,error}=await db.from("rooms").select("*").eq("id",id).maybeSingle(); checkDatabaseError(error); return data;
}
export async function getRoomByCode(db: ServerDatabaseClient,code:string) {
  const {data,error}=await db.from("rooms").select("*").eq("code",code.toUpperCase()).maybeSingle(); checkDatabaseError(error); return data;
}
/** Storage primitive only: no code generation, host creation, or room flow. */
export async function insertRoomRecord(db: ServerDatabaseClient,row:Database["public"]["Tables"]["rooms"]["Insert"]) {
  const {data,error}=await db.from("rooms").insert(row).select().single(); checkDatabaseError(error); return data;
}
