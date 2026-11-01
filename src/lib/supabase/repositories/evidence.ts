import "server-only";
import { checkDatabaseError } from "../errors";
import { evidenceFromRow } from "../mapping";
import { authorizePlayerSession } from "../sessions";
import type { PlayerCredential } from "../sessions";
import type { ServerDatabaseClient } from "../server";

export async function loadEvidenceForEngine(db: ServerDatabaseClient,roomId:string) {
  const {data,error}=await db.from("evidence").select("*").eq("room_id",roomId).order("sequence_no");
  checkDatabaseError(error); return (data ?? []).map(evidenceFromRow);
}

/** Filter at the database query boundary after credential verification. */
export async function getEvidenceForPlayer(db: ServerDatabaseClient,credential:PlayerCredential) {
  const player=await authorizePlayerSession(db,credential);
  const {data,error}=await db.from("evidence").select("*").eq("room_id",player.roomId)
    .or(`owner_player_id.eq.${player.playerId},visibility.in.(shared,public)`).order("sequence_no");
  checkDatabaseError(error); return (data ?? []).map(evidenceFromRow);
}

export async function getIntelligenceForPlayer(db: ServerDatabaseClient,credential:PlayerCredential) {
  const player=await authorizePlayerSession(db,credential);
  const {data,error}=await db.from("private_intel").select("*").eq("room_id",player.roomId)
    .or(`player_id.eq.${player.playerId},visibility.in.(shared,public)`).order("sequence_no");
  checkDatabaseError(error);
  const evidence=await getEvidenceForPlayer(db,credential);
  return (data ?? []).flatMap(row=>{
    const linked=row.evidence_key ? evidence.find(item=>item.key===row.evidence_key) : undefined;
    // A mismatched private evidence link must fail closed, never reveal its text.
    if(row.evidence_key && !linked) return [];
    return [{id:row.id,ownerPlayerId:row.player_id,round:row.round,text:linked?.description ?? row.content ?? "",
      visibility:row.visibility,confidence:row.confidence,additionalClues:row.additional_clues}];
  });
}
