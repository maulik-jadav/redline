import { expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { fullStep,playMatch } from "./full-game.test-support";
import { planCommand } from "./commands";
import { ids,mission } from "./fixtures.test-support";
import type { EngineState } from "@/lib/game";
it("allows an active non-host to complete every round after the host disconnects",()=>{
  let state=fullStep(mission("demo"),{type:"begin"},ids[0],"2042-01-01T00:00:00.000Z").states[0];
  let safety=0;
  while(state.status!=="completed"&&safety++<40){state=fullStep(state,{type:state.phase==="consequence"?"next":"timeout"},ids[1]).states.at(-1)!;}
  expect(state.status).toBe("completed");expect(state.resolvedRounds).toEqual([1,2,3,4,5]);expect(state.redlineResolution).toBe("deadlock");expect(state.timeline.filter(entry=>entry.type==="ending")).toHaveLength(1);
});
it("replays a round-advance command without advancing twice or delivering future intel",()=>{
  let boundary:EngineState|undefined;playMatch("truth",before=>{if(before.round===2&&before.phase==="consequence")boundary=before;});
  const state=boundary!;const actor={playerId:ids[1],isHost:false};const input={commandId:"00000000-0000-4000-8000-555555555555",expectedVersion:state.version,intention:{type:"next" as const}};
  const first=planCommand(state,actor,input,state.phaseEndsAt!,{fullGame:true});const next=first.states[0];expect(next.round).toBe(3);
  expect(planCommand(next,actor,input,state.phaseEndsAt!,{fullGame:true}).states).toEqual([]);expect(next.privateIntel.every(value=>value.round<=3)).toBe(true);
});
it("rejects late final selections and premature timeout intentions",()=>{
  let redline:EngineState|undefined;playMatch("truth",before=>{if(before.phase==="redline_protocol")redline=before;});const state=redline!;
  expect(()=>fullStep(state,{type:"redline",choice:"manual_takeover"},ids[3],state.phaseEndsAt)).toThrow();
  expect(()=>fullStep(state,{type:"timeout"},ids[3],new Date(Date.parse(state.phaseEndsAt!)-1).toISOString())).toThrow();
});
