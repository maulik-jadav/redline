"use client";
import { useCallback,useEffect } from "react";
import { motion,useReducedMotion } from "motion/react";
import type { CrisisSnapshot } from "@/types/crisis";
import { useGameAudio } from "@/hooks/use-game-audio";
import { playSound } from "@/lib/audio/controller";
import { useRouter } from "next/navigation";
import { EvidenceBoard,AbilityPanel,RedlineProtocol } from "./full-game-panels";
import { useCrisis } from "@/hooks/use-crisis";
import { MissionIntro } from "./mission-intro";
import { MetricPanel } from "./metric-panel";
import { NovusGrid } from "./novus-grid";
import { EventFeed,OperatorBar,PrivateIntelPanel } from "./intelligence";
import { CommandPanel } from "./command-panel";
import { ConsequenceOverlay,VotingOverlay } from "./decision-overlays";
export function CommandCenter({initial}:{initial:CrisisSnapshot}) {
  const router=useRouter();
  const {snapshot,connection,online,error,pending,command,remaining}=useCrisis(initial);const reduced=useReducedMotion();
  useGameAudio(snapshot);
  const begin=useCallback(()=>{void command({type:"begin"});},[command]);
  const send=useCallback((intent:Parameters<typeof command>[0])=>{void command(intent).then(ok=>{if(ok&&["vote","redline"].includes(intent.type))playSound("vote_submit",`${snapshot.code}:${snapshot.version}:submit`);});},[command,snapshot.code,snapshot.version]);
  useEffect(()=>{if(["round_intro","voting","consequence"].includes(snapshot.phase))window.scrollTo({top:0,behavior:reduced?"instant":"smooth"});},[snapshot.phase,reduced]);
  useEffect(()=>{if(snapshot.resultsReady)router.replace(`/results/${snapshot.code}`);},[snapshot.resultsReady,snapshot.code,router]);
  if(snapshot.phase==="mission_intro")return <><MissionIntro grid={snapshot.metrics.grid} onComplete={begin} pending={pending}/>{error&&<p role="alert" className="intro-error system-error">{error}</p>}</>;
  return <main className={`crisis-surface entry-surface min-h-svh round-${snapshot.round??1} ${snapshot.phase==="redline_protocol"?"protocol-active":""}`} data-role={snapshot.self.role}><header className="crisis-header"><span className="brand-mark">REDLINE_</span><span>BLACKOUT / {snapshot.code}</span><span>ROUND {snapshot.round??1} / 5 · {snapshot.roundName}</span><span className="hidden sm:inline">{connection==="live"?"● LIVE":"◌ RECONNECTING / FALLBACK"}</span><span className={!snapshot.roundComplete&&(remaining??99)<=10?"text-emergency":"text-technical"}>{snapshot.roundComplete?"ROUND COMPLETE":snapshot.phase.replaceAll("_"," ").toUpperCase()}{remaining!==null&&!snapshot.roundComplete?` / ${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`:""}</span></header>
    <div className="command-workspace">
      {error&&<p className="system-error" role="alert">COMMAND REJECTED / {error}</p>}
      {snapshot.phase==="round_intro"&&<motion.section className="critical-event" initial={reduced?false:{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} role="status"><p className="eyebrow">CRITICAL EVENT / ORACLE EMERGENCY SIGNAL</p><h1>{snapshot.activeEvent?.headline}</h1><p>{snapshot.activeEvent?.description}</p></motion.section>}
      {snapshot.phase==="redline_protocol"&&<RedlineProtocol snapshot={snapshot} remaining={remaining} send={send} pending={pending}/>}
      {snapshot.phase==="results"&&<section className="critical-event"><p className="eyebrow">{snapshot.finalResponse?.headline==="REDLINE DEADLOCK"?"CONSENSUS FAILED / AUTONOMOUS GRID OPERATION CONTINUES":"CONSENSUS REACHED / FINAL RESPONSE AUTHORIZED"}</p><h1>{snapshot.finalResponse?.headline??"CRISIS TERMINATED"}</h1><p>{snapshot.finalResponse?.description} Opening post-crisis analysis…</p></section>}
      {snapshot.phase==="voting"&&<VotingOverlay snapshot={snapshot} remaining={remaining} send={send} pending={pending}/>}
      {snapshot.consequence&&!snapshot.roundComplete&&<ConsequenceOverlay snapshot={snapshot}/>}
      {snapshot.roundComplete&&snapshot.consequence&&<p className="outcome-summary">{snapshot.consequence.authorized?"DECISION AUTHORIZED":"DECISION REJECTED"} / {snapshot.consequence.title} <span>ROUND {snapshot.round} COMPLETE</span></p>}
      <div className={`command-topology ${snapshot.phase==="round_intro"?"event-dimmed":""}`}><MetricPanel metrics={snapshot.metrics} deltas={!snapshot.roundComplete?snapshot.consequence?.deltas:undefined}/><NovusGrid map={snapshot.map} recorded={!!snapshot.consequence}/><EventFeed snapshot={snapshot}/></div>
      <OperatorBar snapshot={snapshot} online={online} connection={connection}/>
      {snapshot.roundComplete&&<section className="round-complete"><p className="eyebrow text-technical">ROUND {snapshot.round} COMPLETE</p><h2>{snapshot.roundName} RESPONSE RECORDED</h2><p>NEW CRISIS SIGNAL DETECTED</p><button className="command-button mt-6" disabled={pending} onClick={()=>send({type:"next"})}>CONTINUE TO ROUND {(snapshot.round??0)+1}</button></section>}
      <div className="command-bottom"><div className="private-workspace"><AbilityPanel snapshot={snapshot} send={send} pending={pending}/><PrivateIntelPanel snapshot={snapshot} send={send} pending={pending}/></div><CommandPanel snapshot={snapshot} send={send} pending={pending}/></div>
      <EvidenceBoard snapshot={snapshot} send={send} pending={pending}/>

    </div>
  </main>;
}
