"use client";
import { useEffect,useState } from "react";
import { motion,useReducedMotion } from "motion/react";
export function MissionIntro({grid,onComplete,pending}:{grid:number;onComplete:()=>void;pending:boolean}) {
  const [step,setStep]=useState(0);const reduced=useReducedMotion();
  useEffect(()=>{const timer=setTimeout(()=>{if(step<2)setStep(step+1);else onComplete();},reduced?250:step===2?1500:1700);return ()=>clearTimeout(timer);},[step,reduced,onComplete]);
  return <main className="mission-intro"><div className="eyebrow text-technical">REDLINE / BLACKOUT</div><motion.section key={step} initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.35}} aria-live="polite">
    {step===0?<><h1>NOVUS CITY — 2042</h1><p>3.2 MILLION RESIDENTS.<br/>ONE AUTONOMOUS ELECTRICAL GRID.<br/>SOMETHING IS GOING WRONG.</p></>:step===1?<><h1>ORACLE EMERGENCY STATE</h1><div className="intro-readout"><span>GRID STABILITY<strong>{grid}%</strong></span><span>CASCADE RISK<strong>UNKNOWN</strong></span></div></>:<><h1>INITIALIZING<br/>CRISIS COMMAND…</h1><p>ESTABLISHING OPERATOR CONNECTIONS</p></>}
  </motion.section><button className="command-button" disabled={pending} onClick={onComplete}>{pending?"SYNCHRONIZING…":"SKIP / ENTER COMMAND"}</button></main>;
}
