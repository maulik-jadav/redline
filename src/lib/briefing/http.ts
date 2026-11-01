import "server-only";
import { cookies } from "next/headers";
import { roomCodeSchema } from "@/lib/rooms/validation";
import { decodeCredential, roomCookieName } from "@/lib/rooms/identity";
import { lobbyFailure } from "@/lib/rooms/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function briefingMember(params:Promise<{roomCode:string}>) {
  const parsed=roomCodeSchema.safeParse((await params).roomCode);
  if(!parsed.success)lobbyFailure("INVALID_ROOM_CODE");
  const credential=decodeCredential((await cookies()).get(roomCookieName(parsed.data))?.value);
  if(!credential)lobbyFailure("INVALID_SESSION");
  return {code:parsed.data,credential,db:createServerSupabaseClient()};
}
