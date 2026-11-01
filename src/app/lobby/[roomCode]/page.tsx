import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { EntryForm } from "@/components/landing/entry-form";
import { LobbyRoom } from "@/components/lobby/lobby-room";
import { roomCodeSchema } from "@/lib/rooms/validation";
import { decodeCredential, roomCookieName } from "@/lib/rooms/identity";
import { getLobbyForMember } from "@/lib/rooms/service";
import { publicLobbyError } from "@/lib/rooms/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LobbyPage({params}:{params:Promise<{roomCode:string}>}) {
  const parsed=roomCodeSchema.safeParse((await params).roomCode);
  if(!parsed.success)return <main className="entry-surface min-h-svh p-10"><Link href="/" className="brand-mark">REDLINE_</Link><p role="alert" className="system-error mt-10">INVALID ROOM CODE</p><Link href="/" className="command-button mt-5 max-w-xs">RETURN TO ACCESS</Link></main>;
  const code=parsed.data;const credential=decodeCredential((await cookies()).get(roomCookieName(code))?.value);
  let lobby;let error="";
  if(credential){try{lobby=await getLobbyForMember(createServerSupabaseClient(),code,credential);}catch(caught){error=publicLobbyError(caught).message;}}
  if(lobby?.status==="active")redirect(`/briefing/${code}`);
  return <main className="entry-surface min-h-svh px-6 py-7 sm:px-10 lg:px-16">
    <header className="brand-header"><Link href="/" className="brand-mark">REDLINE<span aria-hidden="true">_</span></Link><span className="header-label">LOBBY / {code}</span></header>
    <div className="mx-auto max-w-6xl py-12 lg:py-16"><div className="mb-9 flex items-end justify-between gap-4"><div><p className="eyebrow mb-3 text-technical">BLACKOUT / OPERATOR ASSEMBLY</p><h2 className="text-3xl font-medium tracking-tight">{lobby?"Establish your crew.":"You have an invitation."}</h2></div>{lobby&&<span className="eyebrow hidden sm:block">ROOM LINK / ACTIVE</span>}</div>
      {lobby?<LobbyRoom initial={lobby}/>:<div className="max-w-xl"><p className="mb-6 text-sm leading-6 text-muted">Enter your callsign to join this crisis room. Only room members can access the operator roster.</p>{error&&<p role="alert" className="system-error mb-5">{error}</p>}<EntryForm roomCode={code}/></div>}
    </div>
  </main>;
}
