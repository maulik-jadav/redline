import { beforeEach,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocked=vi.hoisted(()=>({context:vi.fn(),analysis:vi.fn(),read:vi.fn(),enhance:vi.fn()}));
vi.mock("./context",()=>({gameContext:mocked.context}));
vi.mock("@/lib/ai/game-master",()=>({analyzeCustom:mocked.analysis,readAnalysis:mocked.read,enhanceConsequence:mocked.enhance}));
import { runGameplayCommand } from "./commands";
import { discussion,ids,members,room } from "./fixtures.test-support";
import { fullStep } from "./full-game.test-support";
import { opaqueRef } from "./snapshots";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import type { EngineState } from "@/lib/game";
import { fromPersistenceSnapshot } from "@/lib/supabase/mapping";
import type { PersistenceSnapshot } from "@/lib/supabase/database.types";
const credential={roomId:room,playerId:ids[0],token:"t".repeat(43)};
const at="2042-01-01T00:00:05.000Z";
const commandId="00000000-0000-4000-8000-123456789000";
const classification={actionCategory:"grid_stabilization",recommendedEffects:{grid:4,safety:0,economy:-2,trust:0,cascadeRisk:-5},shortExplanation:"Reduce noncritical load."};
function candidate(){return fullStep(discussion("demo"),{type:"propose",title:"Controlled load reduction",action:"Reduce noncritical load",reason:"Protect essential services"},ids[0],at).states[0];}
function database(state:EngineState,host=true){mocked.context.mockResolvedValue({state,members,self:{...members[0],is_host:host}});const rpc=vi.fn().mockResolvedValue({error:null});return {db:{rpc} as unknown as ServerDatabaseClient,rpc};}
beforeEach(()=>{vi.resetAllMocks();mocked.enhance.mockResolvedValue(undefined);});
it("keeps a custom proposal unselected when analysis is unavailable, preserving canonical choices",async()=>{
  const state=candidate();const original=structuredClone(state);const {db,rpc}=database(state);mocked.analysis.mockResolvedValue(null);
  await expect(runGameplayCommand(db,"TEST",credential,{commandId,expectedVersion:state.version,intention:{type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])}},at)).rejects.toMatchObject({code:"AI_ANALYSIS_OFFLINE"});
  expect(rpc).not.toHaveBeenCalled();expect(state).toEqual(original);
  expect(fullStep(state,{type:"canonical",responseId:"r1_reduce_sector_7_load"},ids[0],at).states).toHaveLength(1);
});
it("rejects an unauthorized custom selection before spending an AI request",async()=>{
  const state=candidate();const {db,rpc}=database(state,false);
  await expect(runGameplayCommand(db,"TEST",credential,{commandId,expectedVersion:state.version,intention:{type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])}},at)).rejects.toMatchObject({code:"INVALID_PLAYER"});
  expect(mocked.analysis).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
});
it("applies cached validated custom effects through authoritative vote resolution and persistence",async()=>{
  let state=candidate();state=fullStep(state,{type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])},ids[0],at).states[0];
  for(const actor of ids.slice(1,3))state=fullStep(state,{type:"vote",choice:"approve"},actor,at).states[0];
  const {db,rpc}=database(state);mocked.read.mockResolvedValue(classification);
  await runGameplayCommand(db,"TEST",credential,{commandId,expectedVersion:state.version,intention:{type:"vote",choice:"approve"}},at);
  const saved=rpc.mock.calls[0][1].p_steps as PersistenceSnapshot[];expect(saved).toHaveLength(2);
  const final=fromPersistenceSnapshot(saved[1]);expect(final.phase).toBe("consequence");expect(final.metrics.grid).toBe(state.metrics.grid+4);expect(final.metrics.economy).toBe(state.metrics.economy-2);expect(final.hiddenMetrics.cascadeRisk).toBe(state.hiddenMetrics.cascadeRisk-5);expect(final.scenarioFlags).toEqual(state.scenarioFlags);expect(mocked.analysis).not.toHaveBeenCalled();
});
