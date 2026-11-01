import "server-only";
import { checkDatabaseError } from "../errors";
import type { ServerDatabaseClient } from "../server";

export async function loadTimeline(db:ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("timeline").select("*").eq("room_id",roomId).order("sequence_no"); checkDatabaseError(error); return data ?? [];
}
export async function loadEvents(db:ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("events").select("*").eq("room_id",roomId).order("sequence_no"); checkDatabaseError(error); return data ?? [];
}
