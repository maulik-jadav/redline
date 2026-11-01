import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLobbyForMember } from "@/lib/rooms/service";
import { decodeCredential, roomCookieName } from "@/lib/rooms/identity";
import { roomCodeSchema } from "@/lib/rooms/validation";
import { lobbyFailure } from "@/lib/rooms/errors";
import { assertSameOrigin, errorResponse } from "@/lib/rooms/http";
import { issueRealtimeGrant } from "@/lib/realtime/server";

/** Short-lived transport capability, never the private anonymous session credential. */
export async function POST(request: Request, context: { params: Promise<{roomCode:string}> }) {
  try {
    assertSameOrigin(request);
    const parsed = roomCodeSchema.safeParse((await context.params).roomCode);
    if (!parsed.success) lobbyFailure("INVALID_ROOM_CODE");
    const credential = decodeCredential((await cookies()).get(roomCookieName(parsed.data))?.value);
    if (!credential) lobbyFailure("INVALID_SESSION");
    const lobby = await getLobbyForMember(createServerSupabaseClient(), parsed.data, credential);
    return NextResponse.json({ ok: true, data: issueRealtimeGrant(lobby) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
