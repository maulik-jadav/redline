import type { CrisisSnapshot } from "@/types/crisis";
import type { SoundCue } from "./controller";
/** Public presentation changes only. Never inspect hidden engine state. */
export function snapshotCues(before:CrisisSnapshot,next:CrisisSnapshot):SoundCue[]{
  if(next.version<=before.version||next.code!==before.code)return [];
  if(next.phase!==before.phase){if(next.phase==="redline_protocol")return ["redline_activation"];if(next.phase==="round_intro")return [(next.round??0)>=3?"critical_event":"warning"];if(next.phase==="voting")return ["vote_start"];if(next.phase==="consequence")return [next.consequence?.authorized?"decision_authorized":"decision_rejected"];}
  if(Object.entries(next.map.sectors).some(([key,value])=>value==="offline"&&before.map.sectors[key as keyof typeof before.map.sectors]!=="offline")||next.map.transit==="offline"&&before.map.transit!=="offline")return ["sector_offline"];
  if(next.sharedIntel.length>before.sharedIntel.length||next.ownIntel.length>before.ownIntel.length||next.ownEvidence.length>before.ownEvidence.length)return ["intel_received"];
  return [];
}
