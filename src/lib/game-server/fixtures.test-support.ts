import { createGame,startGame,advancePhase } from "@/lib/game";
import type { EngineState } from "@/lib/game";
import type { CrisisMember } from "@/lib/supabase/database.types";
import type { GameMode } from "@/types";
import { planCommand } from "./commands";
import type { Intention } from "./commands";
export const room="00000000-0000-4000-8000-000000009000";
export const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-00000000900${n}`);
export const roles={engineer:ids[0],mayor:ids[1],executive:ids[2],journalist:ids[3]};
export const members:CrisisMember[]=Object.entries(roles).map(([role,id],i)=>({id,role:role as keyof typeof roles,display_name:`Operator${i+1}`,is_host:i===0}));
export const time="2042-01-01T00:00:00.000Z";
export function mission(mode:GameMode="standard") {
  const initial=createGame({roomId:room,mode,roleAssignments:roles});const start=startGame(initial,{commandId:"start",occurredAt:time});if(!start.ok)throw new Error("fixture");
  const intro=advancePhase(start.state,{commandId:"briefing-complete",occurredAt:time});if(!intro.ok)throw new Error("fixture");return intro.state;
}
let counter=0;
export function planned(state:EngineState,intention:Intention,playerId=ids[0],at=time) {
  const commandId=`00000000-0000-4000-8000-${String(++counter).padStart(12,"0")}`;
  return planCommand(state,{playerId,isHost:playerId===ids[0]},{commandId,expectedVersion:state.version,intention},at);
}
export function step(state:EngineState,intention:Intention,playerId=ids[0],at=time) {return planned(state,intention,playerId,at).states.at(-1)??state;}
export function discussion(mode:GameMode="standard") {const intro=step(mission(mode),{type:"begin"});return step(intro,{type:"timeout"},ids[0],intro.phaseEndsAt!);}
