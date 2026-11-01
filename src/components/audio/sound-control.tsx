"use client";
import { useEffect,useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Volume2,VolumeX } from "lucide-react";
import { soundPreference,toggleSound,unlockSound } from "@/lib/audio/controller";
export function SoundControl(){
  const path=usePathname();
  const enabled=useSyncExternalStore(soundPreference.subscribe,soundPreference.snapshot,soundPreference.serverSnapshot);
  useEffect(()=>{soundPreference.restore();const unlock=()=>{void unlockSound();};window.addEventListener("pointerdown",unlock);window.addEventListener("keydown",unlock);return ()=>{window.removeEventListener("pointerdown",unlock);window.removeEventListener("keydown",unlock);};},[]);
  return <button className={`sound-control ${path.startsWith("/crisis/")?"sound-in-crisis":""}`} aria-label={enabled?"Turn sound off":"Turn sound on"} aria-pressed={enabled} onClick={()=>void toggleSound()}>{enabled?<Volume2 size={15} aria-hidden="true"/>:<VolumeX size={15} aria-hidden="true"/>}SOUND {enabled?"ON":"OFF"}</button>;
}
