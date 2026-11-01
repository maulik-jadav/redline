import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { enterRoom, getLobbyForMember } from "@/lib/rooms/service";
import { entrySchema } from "@/lib/rooms/validation";
import { cookieOptions, decodeCredential, encodeCredential, generateIssuanceSeed, ISSUANCE_COOKIE, roomCookieName, validSeed } from "@/lib/rooms/identity";
import { lobbyFailure } from "@/lib/rooms/errors";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/rooms/http";
import { notifyLobbyChanged } from "@/lib/realtime/server";

/** Issues only a private retry seed; grants no room membership or data access. */
export async function GET() {
  const jar=await cookies();
  if(!validSeed(jar.get(ISSUANCE_COOKIE)?.value))jar.set(ISSUANCE_COOKIE,generateIssuanceSeed(),cookieOptions);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request) {
  try {
    assertSameOrigin(request);
    const parsed=entrySchema.safeParse(await readJson(request));
    if(!parsed.success){const field=parsed.error.issues[0]?.path[0];lobbyFailure(field==="callsign"?"INVALID_CALLSIGN":field==="roomCode"?"INVALID_ROOM_CODE":"INVALID_REQUEST");}
    const input=parsed.data;const jar=await cookies();const seed=jar.get(ISSUANCE_COOKIE)?.value;
    if(!validSeed(seed))lobbyFailure("INVALID_REQUEST");
    const db=createServerSupabaseClient();
    if(input.operation==="join") {
      const existing=decodeCredential(jar.get(roomCookieName(input.roomCode))?.value);
      if(existing) {
        try {await getLobbyForMember(db,input.roomCode,existing);return NextResponse.json({ok:true,data:{roomCode:input.roomCode}});}
        catch(error){if(typeof error!=="object"||error===null||!("code"in error)||error.code!=="INVALID_SESSION")throw error;}
      }
    }
    const result=await enterRoom(db,input,seed);
    jar.set(roomCookieName(result.code),encodeCredential(result.credential),cookieOptions);
    await notifyLobbyChanged(db,result.code);
    return NextResponse.json({ok:true,data:{roomCode:result.code}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return errorResponse(error);}
}
