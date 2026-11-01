"use client";
import { motion,useReducedMotion } from "motion/react";
import type { GridMapState,SectorId } from "@/types/map";
const nodes:{id:SectorId;label:string;x:number;y:number}[]=[{id:"north",label:"NORTH",x:260,y:60},{id:"west",label:"WEST",x:115,y:170},{id:"central",label:"CENTRAL",x:350,y:170},{id:"industrial",label:"INDUSTRIAL",x:155,y:310},{id:"medical",label:"MEDICAL",x:420,y:310},{id:"sector_7",label:"SECTOR 7",x:270,y:440}];
const edges=[[0,1],[0,2],[1,2],[1,3],[2,3],[2,4],[3,4],[3,5],[4,5]];
const rank={stable:0,warning:1,critical:2,offline:3};
const colors={stable:"#67d9ed",warning:"#fbbf24",critical:"#ef4444",offline:"#718096"};
export function NovusGrid({map,recorded}:{map:GridMapState;recorded:boolean}) {
  const reduced=useReducedMotion();
  return <section className="crisis-panel grid-panel"><div className="flex items-center justify-between px-5 py-4"><h2 className="eyebrow">NOVUS GRID / LIVE TOPOLOGY</h2><span className="font-mono text-[9px] text-muted">6 PHYSICAL SECTORS</span></div>
    <svg viewBox="0 0 540 510" role="img" aria-label="Novus electrical grid. Sector statuses shown beside each node." className="novus-grid">
      <defs><pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#293641"/></pattern></defs><rect width="540" height="510" fill="url(#grid-dots)"/>
      {edges.map(([a,b])=>{const from=map.sectors[nodes[a].id],to=map.sectors[nodes[b].id];const status=rank[from]>rank[to]?from:to;return <g key={`${a}-${b}`}><line x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={colors[status]} strokeOpacity={status==="offline"?.12:.18} strokeWidth="2"/><motion.line x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={colors[status]} strokeOpacity={status==="offline"?0:.55} strokeWidth="1.5" strokeDasharray="3 18" animate={reduced||status==="offline"?{}:{strokeDashoffset:[0,-84]}} transition={{duration:status==="stable"?9:status==="warning"?6:4,repeat:Infinity,ease:"linear"}}/></g>;})}
      {nodes.map(node=>{const status=map.sectors[node.id];return <g key={node.id} aria-label={`${node.label}: ${status}`}>
        <motion.circle cx={node.x} cy={node.y} r={20} fill="none" stroke={colors[status]} strokeOpacity=".2" animate={!reduced&&status!=="stable"?{r:[19,25,19],opacity:[.3,.7,.3]}:{r:20}} transition={{duration:2,repeat:reduced?0:Infinity}}/>
        <rect x={node.x-24} y={node.y-24} width={48} height={48} rx={status==="stable"?24:status==="warning"?10:2} fill="#101a21" stroke={colors[status]} strokeOpacity=".45"/><motion.circle cx={node.x} cy={node.y} r={7} animate={{fill:colors[status]}} transition={{duration:reduced?0:.5}}/>{status==="offline"&&<path d={`M${node.x-6} ${node.y-6}l12 12m0-12l-12 12`} stroke="#050709" strokeWidth="2"/>}
        <text x={node.x} y={node.y+37} fill="#edf2f7" textAnchor="middle" fontSize="22" fontFamily="monospace">{node.label}</text><text x={node.x} y={node.y+63} fill={colors[status]} textAnchor="middle" fontSize="18" fontFamily="monospace">{status.toUpperCase()}</text>
      </g>;})}
    </svg><div className="grid-caption">SECTOR 7 / {map.sectors.sector_7.toUpperCase()}{recorded?" · RESPONSE RECORDED":""}<span>TRANSIT / {map.transit.toUpperCase()}</span></div>
  </section>;
}
