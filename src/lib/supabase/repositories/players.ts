import "server-only";
import type { Database } from "../database.types";
import { checkDatabaseError } from "../errors";
import type { ServerDatabaseClient } from "../server";

export async function getPlayersForRoom(db: ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("players").select("id,room_id,display_name,role,is_host,is_ready,connection_status,activity,joined_at,updated_at")
    .eq("room_id",roomId).order("joined_at"); checkDatabaseError(error); return data ?? [];
}
export async function insertPlayerRecord(db: ServerDatabaseClient,row:Database["public"]["Tables"]["players"]["Insert"]) {
  const {data,error}=await db.from("players").insert(row).select().single(); checkDatabaseError(error); return data;
}
