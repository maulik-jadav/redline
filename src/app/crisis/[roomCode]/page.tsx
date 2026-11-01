import Link from "next/link";
import { briefingMember } from "@/lib/briefing/http";
import { gameContext } from "@/lib/game-server/context";
import { crisisSnapshot } from "@/lib/game-server/snapshots";
import { gameError } from "@/lib/game-server/errors";
import { CommandCenter } from "@/components/crisis/command-center";
export default async function CrisisPage({params}:{params:Promise<{roomCode:string}>}) {
  let initial;let message="";
  try {const {db,code,credential}=await briefingMember(params);const {state,members}=await gameContext(db,code,credential,{fullGame:true});initial=crisisSnapshot(state,members,credential.playerId,code,new Date().toISOString());}
  catch(error){message=gameError(error).message;}
  if(initial)return <CommandCenter initial={initial}/>;
  return <main className="entry-surface min-h-svh p-10"><Link className="brand-mark" href="/">REDLINE_</Link><section className="access-panel mx-auto mt-24 max-w-xl p-8"><p className="eyebrow text-emergency">ACCESS DENIED</p><h1 className="mt-6 text-2xl">Crisis command unavailable.</h1><p className="system-error mt-6" role="alert">{message}</p><Link href="/" className="command-button mt-8">RETURN TO ACCESS</Link></section></main>;
}
