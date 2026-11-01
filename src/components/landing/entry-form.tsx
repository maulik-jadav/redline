"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Plus, Radio } from "lucide-react";
import type { LobbyApiResult } from "@/types/lobby";

export function EntryForm({roomCode}:{roomCode?:string}) {
  const [operation,setOperation]=useState<"create"|"join"|null>(roomCode?"join":null);
  const [callsign,setCallsign]=useState("");const [code,setCode]=useState(roomCode??"");const [mode,setMode]=useState("standard");
  const [prepared,setPrepared]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState("");
  const requestId=useRef<string|null>(null);const router=useRouter();
  useEffect(()=>{
    let active=true;
    fetch("/api/rooms",{cache:"no-store"}).then(response=>{if(!response.ok)throw new Error();if(active)setPrepared(true);})
      .catch(()=>{if(active)setError("Secure session setup is unavailable. Refresh to try again.");});
    return ()=>{active=false;};
  },[]);
  function choose(next:"create"|"join"|null){setOperation(next);setError("");requestId.current=null;}
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(pending)return;setPending(true);setError("");
    requestId.current??=crypto.randomUUID();
    try {
      const response=await fetch("/api/rooms",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        operation,requestId:requestId.current,callsign,...(operation==="create"?{mode}:{roomCode:code}),
      })});
      const result=await response.json() as LobbyApiResult<{roomCode:string}>;
      if(!result.ok){setError(`${result.code.replaceAll("_"," ")} — ${result.message}`);return;}
      router.push(`/lobby/${result.data.roomCode}`);router.refresh();
    }catch{setError("CONNECTION INTERRUPTED — Try again. Your request can be safely retried.");}
    finally{setPending(false);}
  }
  return <section className="access-panel" aria-labelledby="access-heading">
    <div className="panel-heading"><LockKeyhole size={15} aria-hidden="true"/><span>OPERATOR ACCESS</span><span className="text-technical">PRIVATE SESSION</span></div>
    {!operation?<>
      <div className="p-7 sm:p-9"><p className="eyebrow mb-3">ESTABLISH A CONNECTION</p><h2 id="access-heading" className="text-2xl font-medium">Enter the crisis room.</h2>
        <p className="mt-4 max-w-sm text-sm leading-6 text-muted">Bring four operators. Each will hold a different part of the truth.</p>
        <div className="mt-9 grid gap-3"><button className="command-button primary" onClick={()=>choose("create")}><Plus size={17} aria-hidden="true"/>CREATE CRISIS ROOM<ArrowRight size={16} aria-hidden="true"/></button>
          <button className="command-button" onClick={()=>choose("join")}><Radio size={17} aria-hidden="true"/>JOIN ROOM<ArrowRight size={16} aria-hidden="true"/></button></div>
      </div><div className="panel-footnote">NO ACCOUNT REQUIRED · PRIVATE SESSION</div>
    </>:<form onSubmit={submit} className="p-7 sm:p-9">
      <div className="mb-7 flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">{operation==="create"?"NEW CONNECTION":"ROOM ACCESS"}</p>
        <h2 id="access-heading" className="text-2xl font-medium">{operation==="create"?"Create a crisis room.":roomCode?`Join ${roomCode}.`:"Join a crisis room."}</h2></div>
        {!roomCode&&<button type="button" className="text-sm text-muted hover:text-foreground" disabled={pending} onClick={()=>choose(null)}>Back</button>}</div>
      {operation==="join"&&!roomCode&&<label className="field-label">ROOM CODE<input className="command-input uppercase" name="roomCode" autoComplete="off" required maxLength={8} value={code} onChange={event=>{setCode(event.target.value);requestId.current=null;}} disabled={pending} placeholder="7XK9"/></label>}
      <label className="field-label">CALLSIGN<input className="command-input" name="callsign" autoComplete="nickname" required minLength={2} maxLength={20} value={callsign} onChange={event=>{setCallsign(event.target.value);requestId.current=null;}} disabled={pending} placeholder="YOUR CALLSIGN" aria-describedby="callsign-help"/></label>
      <p id="callsign-help" className="-mt-3 mb-6 text-xs leading-5 text-muted">2–20 letters, numbers, spaces, _ or -.</p>
      {operation==="create"&&<fieldset className="mb-7" disabled={pending}><legend className="eyebrow mb-3">CRISIS MODE</legend><div className="grid grid-cols-2 gap-3">
        {[{value:"standard",label:"STANDARD",detail:"8–12 minute crisis"},{value:"demo",label:"DEMO",detail:"4–6 minute accelerated crisis"}].map(option=><label key={option.value} className={`mode-option ${mode===option.value?"selected":""}`}>
          <input type="radio" name="mode" value={option.value} checked={mode===option.value} onChange={()=>{setMode(option.value);requestId.current=null;}}/><span className="font-mono text-xs">{option.label}</span><span className="mt-2 block text-xs leading-5 text-muted">{option.detail}</span></label>)}</div></fieldset>}
      <button type="submit" className="command-button primary w-full" disabled={pending||!prepared}>{pending?"ESTABLISHING SESSION…":!prepared?"SECURING SESSION…":operation==="create"?"CREATE CRISIS ROOM":"JOIN ROOM"}<ArrowRight size={16} aria-hidden="true"/></button>
      <p className="mt-4 text-xs leading-5 text-muted">Your private session stays in this browser.</p>
    </form>}
    {error&&<p role="alert" className="system-error mx-7 mb-7">{error}</p>}
  </section>;
}
