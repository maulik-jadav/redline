import { NextResponse } from "next/server";
import { briefingMember } from "@/lib/briefing/http";
import { assertSameOrigin,readJson } from "@/lib/rooms/http";
import { gameplayCommandSchema,runGameplayCommand } from "@/lib/game-server/commands";
import { gameContext } from "@/lib/game-server/context";
import { crisisSnapshot } from "@/lib/game-server/snapshots";
import { commandFailure,gameErrorResponse } from "@/lib/game-server/errors";
import { notifyLobbyChanged } from "@/lib/realtime/server";
type Context={params:Promise<{roomCode:string}>};
export async function GET(_request:Request,context:Context) {
  try {const {db,code,credential}=await briefingMember(context.params);const {state,members}=await gameContext(db,code,credential,{fullGame:true});
    const snapshot=crisisSnapshot(state,members,credential.playerId,code,new Date().toISOString());
    const broadcasts=await db.from("game_ai").select("payload").eq("room_id",credential.roomId).eq("status","complete");
    for(const row of broadcasts.data??[])if(row.payload?.kind==="broadcast")snapshot.broadcasts.push({channel:row.payload.channel,line:row.payload.line});
    return NextResponse.json({ok:true,data:snapshot},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return gameErrorResponse(error);}
}
export async function POST(request:Request,context:Context) {
  try {assertSameOrigin(request);const parsed=gameplayCommandSchema.safeParse(await readJson(request));if(!parsed.success)commandFailure("INVALID_COMMAND");
    const {db,code,credential}=await briefingMember(context.params);await runGameplayCommand(db,code,credential,parsed.data);await notifyLobbyChanged(db,code,"game_changed");
    return NextResponse.json({ok:true,data:null},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return gameErrorResponse(error);}
}
