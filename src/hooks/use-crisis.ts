"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import type { CrisisSnapshot } from "@/types/crisis";
import type { Intention } from "@/lib/game-server/commands";
import { createLobbySync } from "@/lib/realtime/controller";
import { connectLobby } from "@/lib/realtime/browser";
import type { ConnectionState } from "@/lib/realtime/shared";
import { submitVersionedCommand } from "@/lib/realtime/submit-command";
type Result<T>={ok:true;data:T}|{ok:false;code:string;message:string};
export function useCrisis(initial:CrisisSnapshot) {
  const [snapshot,setSnapshot]=useState(initial);const [connection,setConnection]=useState<ConnectionState>("connecting");
  const [online,setOnline]=useState<Set<string>>(new Set());const [error,setError]=useState("");const [pending,setPending]=useState(false);const [denied,setDenied]=useState(false);
  const syncRef=useRef<ReturnType<typeof createLobbySync<CrisisSnapshot>>|null>(null);
  const latest=useRef(snapshot);const request=useRef(false);const retryIdentity=useRef<{key:string;id:string}|null>(null);
  const offset=useRef(0);const [now,setNow]=useState(Date.parse(initial.serverNow));
  const acceptSnapshot=useCallback((value:CrisisSnapshot)=>{
    if(value.version<latest.current.version||(value.version===latest.current.version&&Date.parse(value.serverNow)<Date.parse(latest.current.serverNow)))return;
    latest.current=value;offset.current=Date.parse(value.serverNow)-Date.now();setSnapshot(value);setError("");
  },[]);
  useEffect(()=>{
    offset.current=Date.parse(initial.serverNow)-Date.now();
    const sync=createLobbySync<CrisisSnapshot>({
      async fetchSnapshot(signal){const result=await (await fetch(`/api/crisis/${initial.code}`,{signal,cache:"no-store"})).json() as Result<CrisisSnapshot>;if(!result.ok)throw result;return result.data;},
      connect:(events,signal)=>connectLobby(initial.code,initial.self.playerId,events,signal),
      snapshot:acceptSnapshot,status:setConnection,presence:setOnline,
      error(caught){if(typeof caught==="object"&&caught!==null&&"code"in caught&&["INVALID_SESSION","ACCESS_DENIED"].includes(String(caught.code))){setDenied(true);sync.stop();setOnline(new Set());}setError("SNAPSHOT UNAVAILABLE — Reconnecting to crisis command.");},visible:()=>!document.hidden,
    });syncRef.current=sync;
    const refresh=()=>sync.refresh();const connected=()=>sync.network(true);const disconnected=()=>sync.network(false);
    const clock=setInterval(()=>setNow(Date.now()+offset.current),250);
    window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);window.addEventListener("online",connected);window.addEventListener("offline",disconnected);
    return ()=>{sync.stop();syncRef.current=null;clearInterval(clock);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);window.removeEventListener("online",connected);window.removeEventListener("offline",disconnected);};
  },[initial.code,initial.self.playerId,initial.serverNow,acceptSnapshot]);
  const command=useCallback(async(intention:Intention)=>{
    if(request.current||denied)return false;request.current=true;setPending(true);setError("");
    const key=JSON.stringify(intention);if(retryIdentity.current?.key!==key)retryIdentity.current={key,id:crypto.randomUUID()};
    try {
      const commandId=retryIdentity.current.id;
      const result=await submitVersionedCommand(async()=>await (await fetch(`/api/crisis/${initial.code}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({commandId,expectedVersion:latest.current.version,intention})})).json() as Result<null>,async()=>{
        const response=await (await fetch(`/api/crisis/${initial.code}`,{cache:"no-store"})).json() as Result<CrisisSnapshot>;if(!response.ok)throw response;acceptSnapshot(response.data);
      });
      syncRef.current?.refresh();
      if(!result.ok){setError(result.message);if(result.code!=="SERVICE_UNAVAILABLE")retryIdentity.current=null;return false;}
      retryIdentity.current=null;return true;
    }catch{setError("COMMAND INTERRUPTED — Retry to confirm authoritative state.");syncRef.current?.refresh();return false;}
    finally{request.current=false;setPending(false);}
  },[initial.code,denied,acceptSnapshot]);
  const deadline=snapshot.phaseEndsAt?Date.parse(snapshot.phaseEndsAt):null;
  const expiryAttempt=useRef("");
  useEffect(()=>{
    if(deadline===null||now<deadline||denied)return;
    const key=`${snapshot.version}:${Math.floor(now/2500)}`;
    if(expiryAttempt.current===key)return;expiryAttempt.current=key;
    if(snapshot.phase==="consequence"||snapshot.phase==="results"){if(!snapshot.roundComplete||snapshot.phase==="results")syncRef.current?.refresh();}
    else void command({type:"timeout"});
  },[deadline,now,snapshot.version,snapshot.phase,snapshot.roundComplete,command,denied]);
  return {snapshot,connection,online,error,pending:pending||denied,command,remaining:deadline===null?null:Math.max(0,Math.ceil((deadline-now)/1000))};
}
