import type { EngineState } from "@/lib/game";
import type { Intention } from "./commands";
import { planCommand } from "./commands";
import { mission,ids } from "./fixtures.test-support";
import { opaqueRef } from "./snapshots";
let serial=100000;
export function fullStep(state:EngineState,intention:Intention,actor=ids[0],at?:string) {
  const now=at??(intention.type==="timeout"||intention.type==="next"?state.phaseEndsAt!:new Date(Date.parse(state.phaseEndsAt??"2042-01-01T00:00:10Z")-1000).toISOString());
  return planCommand(state,{playerId:actor,isHost:actor===ids[0]},{commandId:`00000000-0000-4000-8000-${String(serial++).padStart(12,"0")}`,expectedVersion:state.version,intention},now,{fullGame:true});
}
export function playMatch(path:"truth"|"concealment"|"failure"="truth",capture?:(before:EngineState,plan:ReturnType<typeof fullStep>,actor:string)=>void) {
  let state=mission("demo");const act=(intention:Intention,actor=ids[0],at?:string)=>{const before=state;const plan=fullStep(state,intention,actor,at);capture?.(before,plan,actor);state=plan.states.at(-1)??state;};
  act({type:"begin"},ids[0],"2042-01-01T00:00:00.000Z");
  const responses={truth:["r1_reduce_sector_7_load","r2_reroute_industrial_power","r3_isolate_s7","r4_independent_investigation"],concealment:["r1_reduce_sector_7_load","r2_emergency_generators_only","r3_redistribute_through_oracle","r4_suppress_information_until_crisis_ends"],failure:["r1_maintain_normal_operations","r2_emergency_generators_only","r3_keep_s7_online","r4_suppress_information_until_crisis_ends"]} as const;
  for(let round=1;round<=5;round++) {
    act({type:"timeout"});
    if(path==="truth"&&round===3){act({type:"scan"},ids[0]);act({type:"corporate"},ids[2]);for(const key of ["transformer_degradation_analysis","march_inspection_report"] as const){const item=state.evidence[key]!;act({type:"share_evidence",ref:opaqueRef(item.id)},item.ownerPlayerId);}}
    if(path==="truth"&&round===4){const log=state.evidence.oracle_build_7_4_deployment!;act({type:"share_evidence",ref:opaqueRef(log.id)},ids[0]);act({type:"publish",evidenceRefs:[opaqueRef(state.evidence.march_inspection_report!.id)]},ids[3]);}
    if(round===5){act({type:"timeout"});for(let index=0;index<3;index++)act({type:"redline",choice:path==="failure"?"trust_oracle":path==="concealment"?"total_grid_shutdown":"manual_takeover"},ids[index]);break;}
    const responseId=responses[path][round-1];act({type:"canonical",responseId});act({type:"select",ref:opaqueRef(Object.keys(state.proposals).at(-1)!)});
    for(let index=0;index<3;index++)act({type:"vote",choice:"approve"},ids[index]);
    act({type:"next"});
  }
  return state;
}
