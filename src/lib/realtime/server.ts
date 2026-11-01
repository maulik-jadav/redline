import "server-only";
import { createHmac } from "node:crypto";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import type { LobbyView } from "@/types/lobby";
import { roomTopic } from "./shared";

/** Only called after the existing cookie/session + exact room membership checks. */
export function issueRealtimeGrant(lobby: LobbyView, now = Math.floor(Date.now() / 1000)) {
  const secret = process.env.SUPABASE_REALTIME_JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Realtime signing is not configured.");
  const expiresAt = now + 300;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    role: "authenticated", aud: "authenticated", sub: lobby.selfPlayerId,
    redline_room: lobby.code, redline_realtime: true, iat: now, exp: expiresAt,
  })}`;
  const token = `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
  return { token, playerId: lobby.selfPlayerId, topic: roomTopic(lobby.code), expiresAt };
}

let lastNotificationWarning=0;
/** A committed mutation succeeds even when the transport is unavailable. No socket. */
export async function notifyLobbyChanged(db: ServerDatabaseClient, code: string,event:"lobby_changed"|"game_changed"="lobby_changed"): Promise<void> {
  let channel;
  try {
    await db.realtime.setAuth();
    channel = db.channel(roomTopic(code), { config: { private: true } });
    const result = await channel.httpSend(event, { type: event }, { timeout: 1500 });
    if (!result.success) throw new Error("Notification unavailable");
  } catch {
    // Deliberately omit provider errors, request data, credentials and channel details.
    if(Date.now()-lastNotificationWarning>60000){lastNotificationWarning=Date.now();console.warn("REDLINE notification unavailable; fallback sync active.");}
  } finally {
    if (channel) { try { await db.removeChannel(channel); } catch { /* no socket was subscribed */ } }
  }
}
