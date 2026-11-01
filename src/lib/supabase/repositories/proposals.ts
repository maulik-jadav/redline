import "server-only";
import { checkDatabaseError } from "../errors";
import type { ServerDatabaseClient } from "../server";

/** Engine-only subset loads. Use loadGameState for a consistent multi-table snapshot. */
export async function loadProposals(db:ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("proposals").select("*").eq("room_id",roomId).order("sequence_no"); checkDatabaseError(error); return data ?? [];
}
export async function loadVotes(db:ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("votes").select("*").eq("room_id",roomId).order("sequence_no"); checkDatabaseError(error); return data ?? [];
}
export async function loadAbilities(db:ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("player_abilities").select("*").eq("room_id",roomId); checkDatabaseError(error); return data ?? [];
}
