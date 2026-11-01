"use client";
import { useState } from "react";
import { motion,useReducedMotion } from "motion/react";
import type { CrisisSnapshot } from "@/types/crisis";
import type { Intention } from "@/lib/game-server/commands";
type Props={snapshot:CrisisSnapshot;send:(intent:Intention)=>void;pending:boolean};
export function AbilityPanel({snapshot,send,pending}:Props) {
  const [selected,setSelected]=useState<string[]>([]);const eligible=["discussion","response_selection"].includes(snapshot.phase);
  const own=snapshot.self;const usable=eligible&&own.ability.uses>0;
  return <section className="crisis-panel ability-panel"><div><p className="eyebrow text-technical">PRIVATE ROLE AUTHORIZATION / {own.callsign}</p><h2>{own.ability.name}</h2><p>{own.ability.description}</p><span className="eyebrow">USES REMAINING: {own.ability.uses}</span></div>
    {own.role==="engineer"&&<button className="command-button" disabled={pending||!usable||(snapshot.round??0)<3} onClick={()=>send({type:"scan"})}>SCAN SECTOR 7</button>}
    {own.role==="executive"&&<button className="command-button" disabled={pending||!usable||(snapshot.round??0)<3} onClick={()=>send({type:"corporate"})}>ACCESS HELIX INTERNAL RECORDS</button>}
    {own.role==="mayor"&&<p className="text-xs text-warning">Use AUTHORIZE EMERGENCY ORDER on an eligible proposal.</p>}
    {own.role==="journalist"&&<div>{snapshot.ownEvidence.filter(item=>item.visibility!=="public"&&item.verification!=="contradicted").map(item=><label className="evidence-choice" key={item.ref}><input type="checkbox" checked={selected.includes(item.ref)} onChange={event=>setSelected(value=>event.target.checked?[...value,item.ref]:value.filter(ref=>ref!==item.ref))}/>{item.title} · {item.verification.toUpperCase()}</label>)}<button className="command-button mt-4" disabled={pending||!usable||!selected.length} onClick={()=>send({type:"publish",evidenceRefs:selected})}>PUBLISH SELECTED EVIDENCE</button></div>}
  </section>;
}
export function EvidenceBoard({snapshot}:Props) {
  return <details className="crisis-panel evidence-board" open={snapshot.sharedEvidence.length>0}><summary className="panel-title">CRISIS INTELLIGENCE / SHARED EVIDENCE · {snapshot.sharedEvidence.length} RECORDS</summary><div className="evidence-groups">{["confirmed","unverified","contradicted"].map(verification=><section key={verification}><h3 className="eyebrow text-technical">{verification.toUpperCase()}</h3>{snapshot.sharedEvidence.filter(item=>item.verification===verification).map(item=><article key={item.ref} className={item.title.includes("CORRELATION")?"correlation-card":item.title.includes("MARCH")?"march-report":""}><p className="eyebrow text-muted">{item.visibility.toUpperCase()} / {item.verification.toUpperCase()}</p>{item.title.includes("MARCH")&&<p className="eyebrow report-stamp">HELIX ENERGY / INTERNAL MAINTENANCE REPORT</p>}<h4>{item.title}</h4><p className="whitespace-pre-line">{item.text}</p></article>)}{!snapshot.sharedEvidence.some(item=>item.verification===verification)&&<p className="text-xs text-muted mt-4">NO SHARED RECORDS</p>}</section>)}</div>
    {snapshot.broadcasts.map((broadcast,index)=><div key={`${index}-${broadcast.channel}`} className="world-broadcast"><span className="broadcast-flash">BREAKING</span><p className="eyebrow text-emergency">{broadcast.channel}</p><p>{broadcast.line}</p></div>)}
  </details>;
}
export function RedlineProtocol({snapshot,remaining,send,pending}:Props&{remaining:number|null}) {
  const reduced=useReducedMotion();
  return <motion.section className="redline-finale" initial={reduced?false:{opacity:0,scale:.97}} animate={{opacity:1,scale:1}}><p className="eyebrow">UNCONTROLLED CASCADE IMMINENT</p><h1>R E D L I N E</h1><p>STANDARD RESPONSE OPTIONS EXHAUSTED · PROTOCOL AVAILABLE</p><p className="eyebrow">FINAL AUTHORIZATION REQUIRED</p><strong className="vote-clock">00:{String(remaining??0).padStart(2,"0")}</strong><div className="redline-options">{snapshot.redline.options.map((option,index)=><button className={`redline-option ${snapshot.redline.selections.find(value=>value.name===snapshot.self.callsign)?.choice===option.id?"selected":""}`} aria-pressed={snapshot.redline.selections.find(value=>value.name===snapshot.self.callsign)?.choice===option.id} disabled={pending||remaining===0} onClick={()=>send({type:"redline",choice:option.id})} key={option.id}><span className="eyebrow">PROTOCOL {String.fromCharCode(65+index)}</span><h2>{option.name}</h2><p>{option.description}</p></button>)}</div><div className="redline-selections">{snapshot.redline.selections.map(selection=><p key={selection.name}>{selection.name}<strong>{selection.choice?.replaceAll("_"," ").toUpperCase()??"…"}</strong></p>)}</div><p className="eyebrow">FIRST OPTION TO THREE VOTES WINS · SELECTIONS MAY CHANGE WHILE OPEN</p></motion.section>;
}
