import { NextResponse } from "next/server";
import { briefingMember } from "@/lib/briefing/http";
import { acknowledgeBriefing, acknowledgeSchema, getBriefingContext } from "@/lib/briefing/service";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/rooms/http";
import { lobbyFailure } from "@/lib/rooms/errors";
import { notifyLobbyChanged } from "@/lib/realtime/server";
type Context={params:Promise<{roomCode:string}>};
export async function GET(_request:Request,context:Context) {
  try {
    const {db,code,credential}=await briefingMember(context.params);
    const data=(await getBriefingContext(db,code,credential)).status;
    return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request,context:Context) {
  try {
    assertSameOrigin(request);if(!acknowledgeSchema.safeParse(await readJson(request)).success)lobbyFailure("INVALID_REQUEST");
    const {db,code,credential}=await briefingMember(context.params);
    await acknowledgeBriefing(db,code,credential);await notifyLobbyChanged(db,code);
    return NextResponse.json({ok:true,data:null},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
