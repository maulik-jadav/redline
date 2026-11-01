"use client";
import { useEffect,useRef,useState } from "react";
import { animate,motion,useReducedMotion } from "motion/react";
import type { PublicMetrics } from "@/types/metrics";
export function MetricCard({label,value,delta}:{label:string;value:number;delta?:number}) {
  const previous=useRef(value);const [display,setDisplay]=useState(value);const reduced=useReducedMotion();
  useEffect(()=>{const control=animate(previous.current,value,{duration:reduced?0:.9,onUpdate:next=>setDisplay(Math.round(next))});previous.current=value;return ()=>control.stop();},[value,reduced]);
  return <div className={`metric-readout ${value<40?"metric-danger":value<65?"metric-strained":""}`}><div className="flex justify-between gap-2"><span className="eyebrow">{label}</span>{!!delta&&<motion.span initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} className={delta>0?"text-success":"text-emergency"}>{delta>0?"▲ +":"▼ "}{delta}</motion.span>}</div><span className="metric-condition">{value<40?"CRITICAL":value<65?"STRAINED":"STABLE"}</span><p className="metric-value">{display}<span>%</span></p><div className="metric-track"><motion.span animate={{width:`${value}%`}} transition={{duration:reduced?0:.9}}/></div></div>;
}
export function MetricPanel({metrics,deltas}:{metrics:PublicMetrics;deltas?:PublicMetrics}) {
  return <aside className="crisis-panel city-status"><h2 className="panel-title">CITY STATUS</h2>{([['grid','GRID STABILITY'],['safety','CIVILIAN SAFETY'],['economy','ECONOMIC STABILITY'],['trust','PUBLIC TRUST']] as const).map(([key,label])=><MetricCard key={key} label={label} value={metrics[key]} delta={deltas?.[key]}/>)}<div className="px-5 py-5 font-mono text-[10px] tracking-widest text-muted">CASCADE RISK <span className="float-right text-foreground">UNKNOWN</span></div></aside>;
}
