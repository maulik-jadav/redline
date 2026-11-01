export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";
export const roomTopic = (code: string) => `redline:room:${code}`;
export interface RealtimeGrant { token: string; playerId: string; topic: string; expiresAt: number }

/** Presence is advisory; the authoritative roster decides which identities render. */
export function onlinePlayers(state: Record<string, { playerId?: unknown }[]>): Set<string> {
  const online = new Set<string>();
  for (const metas of Object.values(state)) for (const meta of metas) {
    if (typeof meta.playerId === "string") online.add(meta.playerId);
  }
  return online;
}
