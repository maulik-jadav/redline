"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, Shield, UserRound } from "lucide-react";
import type { LobbyApiResult, LobbyView } from "@/types/lobby";
import { useLobbyRealtime } from "@/hooks/use-lobby-realtime";
import { briefingDestination } from "@/lib/realtime/navigation";

export function LobbyRoom({initial}:{initial:LobbyView}) {
  const {lobby,connection,online,syncError,expired:sessionExpired,refresh,stop}=useLobbyRealtime(initial);
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [copied,setCopied]=useState(false);const [manualInvite,setManualInvite]=useState("");const [expired,setExpired]=useState(false);
  const router=useRouter();
  const invalid=expired||sessionExpired;
  const startCommand=useRef<string|null>(null);
  useEffect(()=>{const destination=briefingDestination({code:lobby.code,status:lobby.status});if(destination)router.replace(destination);},[lobby.code,lobby.status,router]);
  async function initiate() {
    if(busy)return;setBusy(true);setError("");
    startCommand.current??=crypto.randomUUID();
    try {
      const response=await fetch(`/api/lobby/${lobby.code}/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({commandId:startCommand.current})});
      const result=await response.json() as LobbyApiResult<null>;
      if(!result.ok){setError(result.message);if(result.code==="ROOM_ALREADY_STARTED")refresh();return;}
      refresh();
    }catch{setError("AUTHORIZATION INTERRUPTED — Try again.");}finally{setBusy(false);}
  }
  async function mutate(action:"ready"|"leave") {
    if(busy)return;setBusy(true);setError("");
    try{
      const self=lobby.players.find(player=>player.id===lobby.selfPlayerId);
      const response=await fetch(`/api/lobby/${lobby.code}`,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(action==="ready"?{action,ready:!self?.isReady}:{action})});
      const result=await response.json() as LobbyApiResult<null>;
      if(!result.ok){setError(result.message);if(result.code==="INVALID_SESSION")setExpired(true);return;}
      if(action==="leave"){stop();router.push("/");router.refresh();return;}
      refresh();
    }catch{setError("CONNECTION INTERRUPTED — Try again.");}finally{setBusy(false);}
  }
  async function copyInvite(){const url=new URL(`/lobby/${lobby.code}`,window.location.origin).href;
    try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setManualInvite(url);}
  }
  const self=lobby.players.find(player=>player.id===lobby.selfPlayerId);const ready=lobby.players.filter(player=>player.isReady).length;
  return <div className="lobby-grid">
    <p className="realtime-status lg:col-span-2" role="status">{connection==="live"?"● LIVE":connection==="connecting"?"◌ CONNECTING":connection==="reconnecting"?"◌ RECONNECTING":"○ OFFLINE — RETRYING"}<span>{connection==="live"?"ROOM LINK ACTIVE":"FALLBACK SYNC ACTIVE"}</span></p>
    <section className="access-panel"><div className="panel-heading"><UserRound size={15} aria-hidden="true"/><h2>OPERATORS</h2><span className="text-technical">{lobby.players.length} / 4</span></div>
      <div className="operator-list">{Array.from({length:4},(_,index)=>{
        const player=lobby.players[index];return player?<div key={player.id} className={`operator-row ${player.id===lobby.selfPlayerId?"self":""}`}>
          <span className="operator-number">0{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-lg">{player.displayName}</p>
            <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] tracking-widest text-muted">{player.isHost&&<span className="inline-flex items-center gap-1 text-warning"><Shield size={11} aria-hidden="true"/>HOST</span>}{player.id===lobby.selfPlayerId&&<span>YOU · SESSION ACTIVE</span>}<span className={online.has(player.id)&&connection==="live"?"presence-online":""}>{connection!=="live"?(player.id===lobby.selfPlayerId?(connection==="offline"?"○ OFFLINE":"◌ RECONNECTING"):"○ CONNECTION UNKNOWN"):online.has(player.id)?"● ONLINE":"○ OFFLINE"}</span></div></div>
          <span className={`ready-label ${player.isReady?"is-ready":""}`}>{player.isReady&&<Check size={13} aria-hidden="true"/>}{player.isReady?"READY":"NOT READY"}</span>
        </div>:<div className="operator-row empty" key={`empty-${index}`}><span className="operator-number">0{index+1}</span><span className="empty-slot" aria-hidden="true"/><p className="font-mono text-xs tracking-wider text-muted">WAITING FOR OPERATOR</p></div>;
      })}</div>
      <div className="panel-footnote">{lobby.players.length===4?(ready===4?"ALL OPERATORS READY":"FULL CREW"):"AWAITING OPERATORS"} · {ready} / 4 READY</div>
    </section>
    <aside className="flex flex-col gap-5"><section className="access-panel p-7"><p className="eyebrow mb-3">CRISIS ROOM</p><h1 className="room-code">{lobby.code}</h1>
      <div className="mt-6 flex justify-between border-t border-border pt-5 font-mono text-xs"><span className="text-muted">MODE</span><span>{lobby.mode.toUpperCase()}</span></div>
      <p className="mt-3 text-xs text-muted">{lobby.mode==="standard"?"8–12 minute crisis":"4–6 minute accelerated crisis"}</p>
      <button className="command-button mt-7 w-full" onClick={()=>void copyInvite()}><Copy size={14} aria-hidden="true"/>{copied?"INVITE COPIED":"COPY INVITE"}</button>
      <p role="status" className="sr-only">{copied?"Invite copied to clipboard":""}</p>
      {manualInvite&&<label className="field-label mt-4">COPY THIS INVITE<input className="command-input text-xs" readOnly value={manualInvite} onFocus={event=>event.target.select()}/></label>}
    </section>
    <section className="access-panel p-7"><p className="eyebrow mb-4">YOUR STATUS</p>{ready===4&&<p className="authorization-ready" role="status">ALL OPERATORS READY<br/><span>CRISIS AUTHORIZATION AVAILABLE</span></p>}
      {invalid?<a className="command-button primary" href={`/lobby/${lobby.code}`}>REJOIN ROOM</a>:<button className={`command-button w-full ${self?.isReady?"":"primary"}`} onClick={()=>void mutate("ready")} disabled={busy||lobby.status!=="waiting"}>{busy?"UPDATING…":self?.isReady?"MARK NOT READY":"READY"}<Check size={16} aria-hidden="true"/></button>}
      <p className="mt-5 text-xs leading-6 text-muted">{lobby.status==="waiting"?"Awaiting crisis authorization. Your role will be assigned later.":"Lobby changes are closed for this room."}</p>
      {lobby.players.length===4&&ready===4&&lobby.status==="waiting"&&(self?.isHost?<button className="command-button primary mt-5 w-full" disabled={busy||invalid} onClick={()=>void initiate()}>{busy?"AUTHORIZING REDLINE…":"INITIATE CRISIS"}</button>:<p className="eyebrow mt-5">ALL OPERATORS READY · AWAITING HOST AUTHORIZATION</p>)}
      <button className="mt-6 flex items-center gap-2 font-mono text-xs text-muted hover:text-foreground" onClick={()=>void mutate("leave")} disabled={busy||invalid}><LogOut size={13} aria-hidden="true"/>LEAVE ROOM</button>
    </section></aside>
    {(error||syncError)&&<p role="alert" className="system-error lg:col-span-2">{error||syncError}</p>}
  </div>;
}
