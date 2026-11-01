"use client";
import { useEffect,useRef } from "react";
import type { CrisisSnapshot } from "@/types/crisis";
import { playSound } from "@/lib/audio/controller";
import { snapshotCues } from "@/lib/audio/events";
export function useGameAudio(snapshot:CrisisSnapshot){const previous=useRef(snapshot);useEffect(()=>{for(const cue of snapshotCues(previous.current,snapshot))playSound(cue,`${snapshot.code}:${snapshot.version}:${cue}`);previous.current=snapshot;},[snapshot]);}
