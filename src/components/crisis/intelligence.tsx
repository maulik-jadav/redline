"use client";
import { motion,useReducedMotion } from "motion/react";
import type { CrisisSnapshot } from "@/types/crisis";
import type { Intention } from "@/lib/game-server/commands";
import type { ConnectionState } from "@/lib/realtime/shared";
export const roleNames={engineer:"GRID ENGINEER",mayor:"CITY MAYOR",executive:"HELIX EXECUTIVE",journalist:"JOURNALIST"};
export function OperatorBar({snapshot,online,connection}:{snapshot:CrisisSnapshot;online:Set<string>;connection:ConnectionState}) {
  return <section className="operator-bar" aria-label="Operators">{snapshot.operators.map(operator=><div key={operator.presenceId}><p>{operator.name}{operator.isHost&&<span className="ml-2 text-warning">HOST</span>}</p><span>{roleNames[operator.role]}</span><span className="ml-3">{connection==="live"?(online.has(operator.presenceId)?"● ONLINE":"○ OFFLINE"):operator.presenceId===snapshot.self.playerId?"◌ RECONNECTING":"○ CONNECTION UNKNOWN"}</span></div>)}</section>;
}
export function EventFeed({snapshot}:{snapshot:CrisisSnapshot}) {
  const reduced=useReducedMotion();
  return <aside className="crisis-panel event-feed"><h2 className="panel-title">LIVE INTEL / EVENT FEED</h2><div className="feed-scroll">{[...snapshot.events].reverse().map(event=><article key={event.key} className={`feed-event event-${event.kind}`}><p className="eyebrow text-warning">{event.kind==="npc_message"?"INCOMING EMERGENCY COMMUNICATION":event.severity.toUpperCase()}</p><h3>{event.headline}</h3><p>{event.description}</p></article>)}
    {snapshot.sharedIntel.map(intel=><motion.article key={intel.ref} initial={reduced?false:{opacity:0,x:8}} animate={{opacity:1,x:0}} className="feed-event shared-event"><p className="eyebrow text-technical">{intel.owner} SHARED INTELLIGENCE</p><p>{intel.text}</p><span className="eyebrow text-muted">CONFIDENCE: {intel.confidence.toUpperCase()}</span></motion.article>)}
    {[...snapshot.timeline].reverse().map(entry=><div className="timeline-line" key={entry.key}><span>{entry.actor?`${entry.actor} / `:"SYSTEM / "}</span>{entry.message}</div>)}
  </div></aside>;
}
export function PrivateIntelPanel({snapshot,send,pending}:{snapshot:CrisisSnapshot;send:(intent:Intention)=>void;pending:boolean}) {
  const canShare=["discussion","response_selection"].includes(snapshot.phase);
  return <section className="crisis-panel private-panel"><h2 className="panel-title">PRIVATE CHANNEL <span>EYES ONLY / {snapshot.self.callsign}</span></h2>
    {!snapshot.ownIntel.length&&<p className="p-6 text-sm text-muted">Awaiting intelligence distribution.</p>}
    {[...snapshot.ownIntel].reverse().map(intel=><article className="p-6" key={intel.ref}><p className="intel-copy">{intel.text}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-4"><span className="eyebrow text-technical">CONFIDENCE: {intel.confidence.toUpperCase()}{intel.formal?" · EVIDENCE LINKED":""}</span><button className="command-button" disabled={pending||!canShare||intel.visibility!=="private"} onClick={()=>send({type:"share",ref:intel.ref})}>{intel.visibility==="private"?"SHARE WITH ROOM":"INTELLIGENCE RELEASED TO ROOM"}</button></div></article>)}
    {!!snapshot.ownEvidence.length&&<details className="evidence-records"><summary>FORMAL EVIDENCE RECORDS · {snapshot.ownEvidence.length}</summary>{snapshot.ownEvidence.map(evidence=><article key={evidence.ref}><h3>{evidence.title}</h3><p>{evidence.text}</p><p className="eyebrow text-muted">{evidence.verification.toUpperCase()} / {evidence.visibility.toUpperCase()}</p>{evidence.visibility==="private"&&<button className="command-button mt-4" disabled={pending||!canShare} onClick={()=>send({type:"share_evidence",ref:evidence.ref})}>SHARE EVIDENCE</button>}</article>)}</details>}
  </section>;
}
