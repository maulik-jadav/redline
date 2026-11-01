import "server-only";
import { createHash } from "node:crypto";
import { PLAYER_ROLES } from "@/types";
import type { PlayerRole } from "@/types";

/** Roster order and host position never influence the assignment. */
export function assignRoles(roomId:string, commandId:string, players:{id:string;left_at?:string|null}[]):Record<PlayerRole,string> {
  const active=players.filter(player=>!player.left_at);
  if(active.length!==4||new Set(active.map(player=>player.id)).size!==4)throw new Error("Four distinct active operators required.");
  const rank=(id:string)=>createHash("sha256").update(JSON.stringify([roomId,commandId,id])).digest("hex");
  const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
  const ordered=active.map(player=>player.id).sort((a,b)=>compare(rank(a),rank(b))||compare(a,b));
  return Object.fromEntries(PLAYER_ROLES.map((role,index)=>[role,ordered[index]])) as Record<PlayerRole,string>;
}
