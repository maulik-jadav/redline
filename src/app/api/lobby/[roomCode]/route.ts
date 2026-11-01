import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLobbyForMember, updateLobbyMember } from "@/lib/rooms/service";
import { memberActionSchema, roomCodeSchema } from "@/lib/rooms/validation";
import { cookieOptions, decodeCredential, roomCookieName } from "@/lib/rooms/identity";
import { lobbyFailure } from "@/lib/rooms/errors";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/rooms/http";
import { notifyLobbyChanged } from "@/lib/realtime/server";

type Context={params:Promise<{roomCode:string}>};
async function member(context:Context) {
  const parsed=roomCodeSchema.safeParse((await context.params).roomCode);
  if(!parsed.success)lobbyFailure("INVALID_ROOM_CODE");
  const jar=await cookies();const credential=decodeCredential(jar.get(roomCookieName(parsed.data))?.value);
  if(!credential)lobbyFailure("INVALID_SESSION");
  return {code:parsed.data,jar,credential,db:createServerSupabaseClient()};
}
export async function GET(_request:Request,context:Context) {
  try {const {db,code,credential}=await member(context);const data=await getLobbyForMember(db,code,credential);
    return NextResponse.json({ok:true,data},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
export async function POST(request:Request,context:Context) {
  try {
    assertSameOrigin(request);const parsed=memberActionSchema.safeParse(await readJson(request));
    if(!parsed.success)lobbyFailure("INVALID_REQUEST");
    const {db,code,jar,credential}=await member(context);
    // Check the URL's room as well as the cookie's room before any mutation.
    await getLobbyForMember(db,code,credential);
    await updateLobbyMember(db,credential,parsed.data);
    await notifyLobbyChanged(db,code);
    if(parsed.data.action==="leave")jar.set(roomCookieName(code),"",{...cookieOptions,maxAge:0});
    return NextResponse.json({ok:true,data:null},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
