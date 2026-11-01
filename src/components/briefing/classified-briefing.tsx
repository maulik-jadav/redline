"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import type { BriefingStatus, PrivateBriefing } from "@/types/briefing";
import type { LobbyApiResult } from "@/types/lobby";
import { createLobbySync } from "@/lib/realtime/controller";
import { connectLobby } from "@/lib/realtime/browser";
import type { ConnectionState } from "@/lib/realtime/shared";

const accents={engineer:"#67d9ed",mayor:"#fbbf24",executive:"#c4a1ff",journalist:"#ffad67"};
const roleLabels={engineer:"GRID ENGINEER",mayor:"CITY MAYOR",executive:"HELIX EXECUTIVE",journalist:"INVESTIGATIVE JOURNALIST"};
export function ClassifiedBriefing({briefing,initial}:{briefing:PrivateBriefing;initial:BriefingStatus}) {
  const router=useRouter();
  const [status,setStatus]=useState(initial);
  const [stage,setStage]=useState(initial.operators.find(player=>player.id===initial.selfPlayerId)?.acknowledged?6:0);
  const [connection,setConnection]=useState<ConnectionState>("connecting");
  const [error,setError]=useState("");const [expired,setExpired]=useState(false);const [busy,setBusy]=useState(false);
  const reduced=useReducedMotion();const syncRef=useRef<ReturnType<typeof createLobbySync<BriefingStatus>>|null>(null);
  useEffect(()=>{
    if(stage>1)return;
    const timer=setTimeout(()=>setStage(value=>value+1),reduced?0:stage===0?1000:900);
    return ()=>clearTimeout(timer);
  },[stage,reduced]);
  useEffect(()=>{
    const sync=createLobbySync<BriefingStatus>({
      async fetchSnapshot(signal){
        const result=await (await fetch(`/api/briefing/${initial.code}`,{signal,cache:"no-store"})).json() as LobbyApiResult<BriefingStatus>;
        if(!result.ok)throw result;return result.data;
      },
      connect:(events,signal)=>connectLobby(initial.code,initial.selfPlayerId,events,signal),
      snapshot(value){setStatus(value);setError("");},status:setConnection,presence:()=>{},
      error(caught){
        if(typeof caught==="object"&&caught!==null&&"code"in caught&&caught.code==="INVALID_SESSION"){
          setExpired(true);setError("SESSION EXPIRED — Return to operator access.");sync.stop();setConnection("offline");
        }else setError("SYNC INTERRUPTED — Retrying the classified channel.");
      },visible:()=>!document.hidden,
    });syncRef.current=sync;
    const refresh=()=>sync.refresh();const online=()=>sync.network(true);const offline=()=>sync.network(false);
    window.addEventListener("focus",refresh);window.addEventListener("online",online);window.addEventListener("offline",offline);document.addEventListener("visibilitychange",refresh);
    if(!navigator.onLine)offline();
    return ()=>{sync.stop();syncRef.current=null;window.removeEventListener("focus",refresh);window.removeEventListener("online",online);window.removeEventListener("offline",offline);document.removeEventListener("visibilitychange",refresh);};
  },[initial.code,initial.selfPlayerId]);
  async function acknowledge(){
    if(busy||expired)return;setBusy(true);setError("");
    try {
      const result=await (await fetch(`/api/briefing/${initial.code}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"acknowledge"})})).json() as LobbyApiResult<null>;
      if(!result.ok){setError(result.message);return;}setStage(6);syncRef.current?.refresh();
    }catch{setError("ACKNOWLEDGEMENT INTERRUPTED — Try again.");}finally{setBusy(false);}
  }
  const acknowledged=status.operators.find(player=>player.id===status.selfPlayerId)?.acknowledged;
  const waiting=stage===6||acknowledged;
  const intro=status.phase==="mission_intro"&&status.allAcknowledged;
  useEffect(()=>{if(intro)router.replace(`/crisis/${initial.code}`);},[intro,initial.code,router]);
  return <main className="entry-surface briefing-surface min-h-svh px-6 py-7 sm:px-10 lg:px-16" style={{"--role-accent":accents[briefing.role]} as React.CSSProperties}>
    <header className="brand-header"><Link href="/" className="brand-mark">REDLINE<span>_</span></Link><span className="header-label">{initial.code} / PRIVATE CHANNEL · EYES ONLY</span></header>
    <div className="mx-auto max-w-5xl py-10 sm:py-16">
      <div className="mb-8 flex flex-wrap justify-between gap-4 font-mono text-[10px] tracking-widest text-muted"><span>BLACKOUT / CLASSIFIED OPERATOR BRIEFING</span><span role="status">{connection==="live"?"● LIVE":"○ FALLBACK SYNC ACTIVE"}</span></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={intro?"mission":waiting?"waiting":stage} initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={reduced?{}:{opacity:0,y:-6}} transition={{duration:reduced?0:.2}} className="classified-panel" aria-live={stage<2?"polite":"off"}>
          {intro?<><p className="eyebrow role-accent">BRIEFING COMPLETE / 4 OF 4 VERIFIED</p><h1 className="briefing-title">NOVUS CITY — 2042</h1><p className="mt-8 text-xl leading-relaxed text-muted">3.2 million residents.<br/>One autonomous electrical grid.<br/>Something is going wrong.</p><div className="classified-rule"/><p className="eyebrow">MISSION INTRO READY</p><p className="mt-4 text-muted">ORACLE EMERGENCY STATE · AWAITING MISSION AUTHORIZATION</p></>:
          waiting?<><ShieldCheck className="role-accent mb-6" size={34} aria-hidden="true"/><p className="eyebrow role-accent">BRIEFING ACKNOWLEDGED</p><h1 className="briefing-title">Waiting for other operators.</h1><p className="mt-6 font-mono text-sm">{status.acknowledgedCount} / 4 ACKNOWLEDGED</p><div className="mt-8 divide-y divide-border">{status.operators.map(player=><div className="flex justify-between gap-5 py-5" key={player.id}><span>{player.displayName}</span><span className="font-mono text-xs text-muted">{player.acknowledged?"ACKNOWLEDGED":"REVIEWING"}</span></div>)}</div></>:
          stage<2?<div className="briefing-auth"><Fingerprint size={54} className="role-accent" aria-hidden="true"/><p className="eyebrow mt-8">IDENTITY AUTHENTICATION</p><h1 className="mt-5 text-2xl">{stage===0?"VERIFYING OPERATOR…":"ACCESS GRANTED"}</h1><div className="scan-track mt-9"><span/></div><p className="mt-7 font-mono text-xs text-muted">{briefing.callsign} / SESSION VERIFIED</p><button className="command-button mt-7" onClick={()=>setStage(2)}>OPEN DOSSIER</button></div>:
          <><div className="mb-9 flex justify-between gap-4"><span className="eyebrow role-accent">DOSSIER 0{stage-1} / 04</span><LockKeyhole size={18} className="text-muted" aria-hidden="true"/></div>
            {stage===2?<><p className="eyebrow role-accent">{roleLabels[briefing.role]}</p><h1 className="briefing-title uppercase">{briefing.characterName}</h1><p className="mt-4 font-mono text-sm uppercase tracking-wider text-muted">{briefing.title}</p><div className="classified-rule"/><p className="briefing-copy">{briefing.responsibility}</p><button className="command-button mt-10" onClick={()=>setStage(3)}>CONTINUE TO CLASSIFIED <span aria-hidden="true">→</span></button></>:
            stage===3?<><p className="eyebrow text-emergency">CLASSIFIED / EYES ONLY</p><h1 className="briefing-title">What only you know.</h1><p className="briefing-copy secret-copy">{briefing.secret}</p><p className="mt-8 font-mono text-xs leading-6 tracking-wider text-emergency">DO NOT ASSUME THE OTHER OPERATORS KNOW THIS.</p><button className="command-button mt-10" onClick={()=>setStage(4)}>REVIEW DIRECTIVE <span aria-hidden="true">→</span></button></>:
            stage===4?<><p className="eyebrow role-accent">PRIMARY DIRECTIVE</p><h1 className="briefing-title">{briefing.objective.name}</h1><div className="mt-8 space-y-4">{briefing.objective.conditions.map(condition=><p key={condition} className="briefing-copy">{condition}</p>)}</div>{briefing.bonus&&<div className="secondary-directive"><p className="eyebrow text-muted">SECONDARY CONSIDERATION</p><p className="mt-4 leading-7">{briefing.bonus}</p></div>}<button className="command-button mt-10" onClick={()=>setStage(5)}>REVIEW AUTHORIZATION <span aria-hidden="true">→</span></button></>:
            <><p className="eyebrow role-accent">SPECIAL AUTHORIZATION</p><h1 className="briefing-title">{briefing.ability.name}</h1><p className="mt-5 font-mono role-accent">{briefing.ability.uses} USE{briefing.ability.uses===1?"":"S"}</p><p className="briefing-copy mt-8">{briefing.ability.description}</p><div className="classified-rule"/><p className="text-sm text-muted">Authorization recorded. Ability activation becomes available during the crisis.</p><button className="command-button primary mt-9" disabled={busy||expired} onClick={()=>void acknowledge()}>{busy?"RECORDING ACKNOWLEDGEMENT…":"ACKNOWLEDGE BRIEFING"}<Check size={16} aria-hidden="true"/></button></>}
            {stage>2&&<button className="mt-7 block font-mono text-xs text-muted hover:text-foreground" onClick={()=>setStage(value=>value-1)}>← PREVIOUS DOSSIER</button>}
          </>}
        </motion.section>
      </AnimatePresence>
      {error&&<p role="alert" className="system-error mt-6">{error}</p>}
      <p className="mt-7 font-mono text-[10px] tracking-widest text-muted">RESTRICTED OPERATOR ACCESS · {briefing.callsign} · NO PUBLIC DISTRIBUTION</p>
    </div>
  </main>;
}
