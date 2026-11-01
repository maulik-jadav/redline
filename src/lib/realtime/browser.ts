"use client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LobbyApiResult } from "@/types/lobby";
import type { RoomEvents, RoomConnection } from "./controller";
import { onlinePlayers, roomTopic } from "./shared";
import type { RealtimeGrant } from "./shared";

export async function connectLobby(code: string, playerId: string, events: RoomEvents, signal: AbortSignal): Promise<RoomConnection> {
  const client = createBrowserSupabaseClient();
  async function grant() {
    const response = await fetch(`/api/lobby/${code}/realtime`, { method: "POST", signal, cache: "no-store" });
    const result = await response.json() as LobbyApiResult<RealtimeGrant>;
    if (!result.ok || result.data.playerId !== playerId || result.data.topic !== roomTopic(code)) throw new Error("Realtime unavailable");
    await client.realtime.setAuth(result.data.token);
  }
  try { await grant(); } catch (error) { client.realtime.disconnect(); throw error; }
  if (signal.aborted) { client.realtime.disconnect(); throw new Error("Subscription cancelled"); }
  const channel = client.channel(roomTopic(code), { config: { private: true, presence: { key: playerId } } });
  let closed = false;
  let live = false;
  let subscriptionEpoch = 0;
  function close() {
    if (closed) return; closed = true;
    signal.removeEventListener("abort", close);
    void channel.untrack().catch(() => {});
    void client.removeChannel(channel).finally(() => client.realtime.disconnect()).catch(() => {});
  }
  signal.addEventListener("abort", close, { once: true });
  const sync = () => { if (!closed) events.presence(onlinePlayers(channel.presenceState<{playerId:string}>())); };
  channel.on("broadcast", { event: "lobby_changed" }, () => { if (!closed) events.invalidate(); });
  channel.on("broadcast", { event: "game_changed" }, () => { if (!closed) events.invalidate(); });
  channel.on("presence", { event: "sync" }, sync);
  channel.on("presence", { event: "join" }, sync);
  channel.on("presence", { event: "leave" }, sync);
  channel.subscribe(status => {
    if (closed) return;
    const epoch = ++subscriptionEpoch;
    if (status === "SUBSCRIBED") {
      void channel.track({ playerId }).then(result => {
        if (closed || epoch !== subscriptionEpoch) return;
        if (result !== "ok") { events.status("offline"); return; }
        live = true; events.status("live"); sync();
      }).catch(() => { if (!closed && epoch === subscriptionEpoch) events.status("offline"); });
    } else events.status(status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "offline" : live ? "reconnecting" : "connecting");
  });
  return { close, renew: grant };
}
