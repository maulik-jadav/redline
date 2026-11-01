import { NextResponse } from "next/server";
import { briefingMember } from "@/lib/briefing/http";
import { gameContext } from "@/lib/game-server/context";
import { resultsPayload } from "@/lib/game-server/results";
import { gameErrorResponse } from "@/lib/game-server/errors";
export async function GET(_request:Request,context:{params:Promise<{roomCode:string}>}) {
  try{const {db,code,credential}=await briefingMember(context.params);const match=await gameContext(db,code,credential,{fullGame:true});return NextResponse.json({ok:true,data:resultsPayload(match.state,match.members,credential.playerId,code)},{headers:{"Cache-Control":"no-store"}});}catch(error){return gameErrorResponse(error);}
}
