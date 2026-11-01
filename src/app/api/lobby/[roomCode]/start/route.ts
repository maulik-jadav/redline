import { NextResponse } from "next/server";
import { briefingMember } from "@/lib/briefing/http";
import { initiateCrisis, startSchema } from "@/lib/briefing/service";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/rooms/http";
import { lobbyFailure } from "@/lib/rooms/errors";
import { notifyLobbyChanged } from "@/lib/realtime/server";
export async function POST(request:Request,context:{params:Promise<{roomCode:string}>}) {
  try {
    assertSameOrigin(request);const parsed=startSchema.safeParse(await readJson(request));
    if(!parsed.success)lobbyFailure("INVALID_REQUEST");
    const {db,code,credential}=await briefingMember(context.params);
    await initiateCrisis(db,code,credential,parsed.data.commandId);
    await notifyLobbyChanged(db,code);
    return NextResponse.json({ok:true,data:null},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
