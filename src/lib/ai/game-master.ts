import "server-only";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import type { EngineState } from "@/lib/game";
import { classify,classificationSchema,configuredProvider,narrative } from "./provider";
import type { Classification } from "./provider";
export type AiRecord={kind:"classification";classification:Classification}|{kind:"broadcast";channel:string;line:string};
export async function readAnalysis(db:ServerDatabaseClient,roomId:string,proposalId:string) {
  const {data}=await db.from("game_ai").select("payload").eq("room_id",roomId).eq("request_key",`custom:${proposalId}`).maybeSingle();
  if(data?.payload?.kind!=="classification")return null;const parsed=classificationSchema.safeParse(data.payload.classification);return parsed.success?parsed.data:null;
}
export async function analyzeCustom(db:ServerDatabaseClient,state:EngineState,proposalId:string) {
  const previous=await readAnalysis(db,state.roomId,proposalId);if(previous)return previous;
  const provider=configuredProvider();if(!provider)return null;
  const key=`custom:${proposalId}`;const {data,error}=await db.rpc("reserve_game_ai",{p_room_id:state.roomId,p_request_key:key});if(error||!data)return null;
  const proposal=state.proposals[proposalId].proposal;
  const result=await classify(provider,{round:state.round,metrics:state.metrics,proposal:{title:proposal.title,action:proposal.action,reason:proposal.reason}});
  const payload:AiRecord|null=result?{kind:"classification",classification:result}:null;
  const saved=await db.from("game_ai").update({status:result?"complete":"failed",payload}).eq("room_id",state.roomId).eq("request_key",key);
  return saved.error?null:result;
}
/** At most one optional broadcast per completed normal round; never on reads/votes. */
export async function enhanceConsequence(db:ServerDatabaseClient,state:EngineState) {
  try {
    const provider=configuredProvider();if(!provider||state.phase!=="consequence")return;
    const key=`narrative:${state.round}`;const {data,error}=await db.rpc("reserve_game_ai",{p_room_id:state.roomId,p_request_key:key});if(error||!data)return;
    const event=state.events.find(value=>value.id===state.activeEventId);
    const allowedLines=[event?.description??"Emergency response recorded.","Operator response recorded. City status updated.","Emergency operations continue. Await further crisis signals."];
    const result=await narrative(provider,allowedLines);
    await db.from("game_ai").update({status:result?"complete":"failed",payload:result?{kind:"broadcast",...result}:null}).eq("room_id",state.roomId).eq("request_key",key);
  }catch{/* Narrative failure cannot fail an authoritative command. */}
}
