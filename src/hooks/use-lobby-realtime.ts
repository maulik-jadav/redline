"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LobbyApiResult, LobbyView } from "@/types/lobby";
import { createLobbySync } from "@/lib/realtime/controller";
import { connectLobby } from "@/lib/realtime/browser";
import type { ConnectionState } from "@/lib/realtime/shared";

export function useLobbyRealtime(initial: LobbyView) {
  const [lobby, setLobby] = useState(initial);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState("");
  const [expired, setExpired] = useState(false);
  const controller = useRef<ReturnType<typeof createLobbySync<LobbyView>> | null>(null);
  useEffect(() => {
    const sync = createLobbySync<LobbyView>({
      async fetchSnapshot(signal) {
        const response = await fetch(`/api/lobby/${initial.code}`, { signal, cache: "no-store" });
        const result = await response.json() as LobbyApiResult<LobbyView>;
        if (!result.ok) throw result;
        return result.data;
      },
      connect: (events, signal) => connectLobby(initial.code, initial.selfPlayerId, events, signal),
      snapshot(value) { setLobby(value); setSyncError(""); },
      status: setConnection, presence: setOnline,
      error(error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "INVALID_SESSION") {
          setExpired(true); setSyncError("SESSION EXPIRED — Rejoin this crisis room."); sync.stop(); setConnection("offline"); setOnline(new Set());
        } else setSyncError("SYNC INTERRUPTED — Retrying the room connection.");
      },
      visible: () => !document.hidden,
    });
    controller.current = sync;
    const focus = () => sync.refresh();
    const connected = () => sync.network(true);
    const disconnected = () => sync.network(false);
    window.addEventListener("focus", focus); window.addEventListener("online", connected); window.addEventListener("offline", disconnected);
    document.addEventListener("visibilitychange", focus);
    if (!navigator.onLine) disconnected();
    return () => {
      controller.current = null; sync.stop();
      window.removeEventListener("focus", focus); window.removeEventListener("online", connected); window.removeEventListener("offline", disconnected);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [initial.code, initial.selfPlayerId]);
  const refresh = useCallback(() => controller.current?.refresh(), []);
  const stop = useCallback(() => controller.current?.stop(), []);
  return { lobby, connection, online, syncError, expired, refresh, stop };
}
