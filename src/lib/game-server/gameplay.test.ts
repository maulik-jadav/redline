import { describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import { BLACKOUT_ROLES } from "@/data/blackout/roles";
import { PLAYER_ROLES } from "@/types";
import { planCommand,gameplayCommandSchema } from "./commands";
import { crisisSnapshot,opaqueRef } from "./snapshots";
import { discussion,mission,step,planned,ids,members,time } from "./fixtures.test-support";
const after=(time:string,seconds:number)=>new Date(Date.parse(time)+seconds*1000).toISOString();
describe("Round 1 server command planning",()=>{
  it("starts one authoritative Round 1 with event, warning and four distinct intel records",()=>{
    const state=step(mission(),{type:"begin"});
    expect(state).toMatchObject({round:1,phase:"round_intro",map:{sectors:{sector_7:"warning"}}});
    expect(state.events[0]).toMatchObject(BLACKOUT_SCENARIO.rounds[1].publicEvent);
    expect(state.privateIntel).toHaveLength(4);expect(step(state,{type:"begin"})).toBe(state);
  });
  it.each(["standard","demo"] as const)("uses %s canonical discussion/selection/voting deadlines",mode=>{
    let state=discussion(mode);const timing=BLACKOUT_SCENARIO.timings[mode];
    expect(Date.parse(state.phaseEndsAt!)-Date.parse("2042-01-01T00:00:02.400Z")).toBe(timing.discussionSeconds*1000);
    state=step(state,{type:"timeout"},ids[0],state.phaseEndsAt!);expect(state.phase).toBe("response_selection");
    expect(state.phaseEndsAt).toBe(after("2042-01-01T00:00:02.400Z",timing.discussionSeconds+timing.responseSelectionSeconds));
    state=step(state,{type:"timeout"},ids[0],state.phaseEndsAt!);expect(state.phase).toBe("voting");
    expect(state.proposals[state.selectedProposalId!].canonicalResponseId).toBe("r1_investigate_before_acting");
    expect(Date.parse(state.phaseEndsAt!)-Date.parse("2042-01-01T00:00:02.400Z")).toBe((timing.discussionSeconds+timing.responseSelectionSeconds+timing.normalVoteSeconds)*1000);
  });
  it("rejects premature timeout, stale version and actions after deadline",()=>{
    const state=discussion();expect(()=>step(state,{type:"timeout"})).toThrow();
    expect(()=>planCommand(state,{playerId:ids[0],isHost:true},{commandId:ids[0],expectedVersion:0,intention:{type:"canonical",responseId:"r1_reduce_sector_7_load"}},time)).toThrow(expect.objectContaining({code:"STATE_CHANGED"}));
    expect(()=>step(state,{type:"canonical",responseId:"r1_reduce_sector_7_load"},ids[0],state.phaseEndsAt!)).toThrow(expect.objectContaining({code:"PHASE_EXPIRED"}));
  });
  it("blocks role/actor/clock injection at the request schema",()=>{
    for(const extra of [{playerId:ids[1]},{isHost:true},{occurredAt:time},{phaseEndsAt:time},{role:"mayor"}])expect(gameplayCommandSchema.safeParse({commandId:ids[0],expectedVersion:1,intention:{type:"begin"},...extra}).success).toBe(false);
    expect(gameplayCommandSchema.safeParse({commandId:ids[0],expectedVersion:1,intention:{type:"vote",choice:"approve",playerId:ids[1]}}).success).toBe(false);
  });
  it("formal sharing enforces ownership and never rewards a repeated command",()=>{
    let state=discussion();const intel=state.privateIntel.find(value=>value.ownerPlayerId===ids[0])!;
    expect(()=>step(state,{type:"share",ref:opaqueRef(intel.id)},ids[1])).toThrow(expect.objectContaining({code:"EVIDENCE_UNAVAILABLE"}));
    const input={commandId:ids[0],expectedVersion:state.version,intention:{type:"share" as const,ref:opaqueRef(intel.id)}};
    state=planCommand(state,{playerId:ids[0],isHost:true},input,time).states[0];
    expect(state.privateIntel[0].visibility).toBe("shared");expect(planCommand(state,{playerId:ids[0],isHost:true},input,time).states).toEqual([]);
    expect(()=>step(state,{type:"share",ref:opaqueRef(intel.id)})).toThrow(expect.objectContaining({code:"EVIDENCE_ALREADY_SHARED"}));
  });
  it("permits one active custom proposal per player and host-only selection",()=>{
    let state=step(discussion(),{type:"propose",title:"Test",action:"Respond",reason:"Time"},ids[2]);
    expect(()=>step(state,{type:"propose",title:"Again",action:"Respond",reason:"Time"},ids[2])).toThrow(expect.objectContaining({code:"INVALID_PROPOSAL"}));
    const ref=opaqueRef(Object.keys(state.proposals)[0]);expect(()=>step(state,{type:"select",ref},ids[2])).toThrow(expect.objectContaining({code:"INVALID_PLAYER"}));
    state=step(state,{type:"select",ref});expect(state.phase).toBe("voting");expect(()=>step(state,{type:"select",ref})).toThrow();
  });
  it("Mayor can force an eligible vote once; other roles cannot",()=>{
    let state=step(discussion(),{type:"canonical",responseId:"r1_reduce_sector_7_load"});const ref=opaqueRef(Object.keys(state.proposals)[0]);
    expect(()=>step(state,{type:"emergency",ref},ids[2])).toThrow(expect.objectContaining({code:"INVALID_ROLE"}));
    state=step(state,{type:"emergency",ref},ids[1]);expect(state.phase).toBe("voting");expect(state.abilities.emergency_order.remainingUses).toBe(0);
    expect(()=>step(state,{type:"emergency",ref},ids[1])).toThrow();
  });
  it.each([
    ["r1_reduce_sector_7_load",{grid:76,safety:84,economy:70,trust:69},14],
    ["r1_maintain_normal_operations",{grid:69,safety:84,economy:78,trust:68},36],
    ["r1_investigate_before_acting",{grid:71,safety:84,economy:76,trust:68},30],
  ] as const)("executes %s exactly once after three approvals",(responseId,metrics,risk)=>{
    let state=step(discussion(),{type:"canonical",responseId});state=step(state,{type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])});
    state=step(state,{type:"vote",choice:"approve"},ids[0]);
    expect(()=>step(state,{type:"vote",choice:"reject"},ids[0])).toThrow(expect.objectContaining({code:"ALREADY_VOTED"}));
    state=step(state,{type:"vote",choice:"approve"},ids[1]);state=step(state,{type:"vote",choice:"reject"},ids[2]);
    const plan=planned(state,{type:"vote",choice:"approve"},ids[3]);expect(plan.states).toHaveLength(2);state=plan.states[1];
    expect(state.metrics).toEqual(metrics);expect(state.hiddenMetrics.cascadeRisk).toBe(risk);expect(state.resolvedRounds).toEqual([1]);
    expect(state.votes[state.selectedProposalId!]).toHaveLength(4);expect(state.executedResponses).toEqual([responseId]);
    expect(()=>step(state,{type:"timeout"},ids[0],state.phaseEndsAt!)).toThrow(expect.objectContaining({code:"ROUND_ONE_COMPLETE"}));
  });
  it("2/2 finalization and voting timeout both apply canonical inaction once",()=>{
    let base=step(discussion(),{type:"canonical",responseId:"r1_reduce_sector_7_load"});base=step(base,{type:"select",ref:opaqueRef(Object.keys(base.proposals)[0])});
    let split=base;for(let index=0;index<4;index++)split=step(split,{type:"vote",choice:index<2?"approve":"reject"},ids[index]);
    const timeout=step(base,{type:"timeout"},ids[0],base.phaseEndsAt!);
    for(const state of [split,timeout]){expect(state.metrics).toEqual({grid:70,safety:84,economy:76,trust:68});expect(state.hiddenMetrics.cascadeRisk).toBe(30);expect(state.timeline.filter(row=>row.type==="inaction_consequence")).toHaveLength(1);}
  });
  it("approved custom proposals do not invent operational effects",()=>{
    let state=step(discussion(),{type:"propose",title:"Custom",action:"Try",reason:"Test"});state=step(state,{type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])});
    for(let index=0;index<3;index++)state=step(state,{type:"vote",choice:"approve"},ids[index]);
    expect(state.metrics).toEqual(BLACKOUT_SCENARIO.initialState.metrics);expect(state.hiddenMetrics.cascadeRisk).toBe(24);
    const payload=crisisSnapshot(state,members,ids[0],"TEST",after(time,10));expect(payload.consequence?.custom).toBe(true);expect(payload.consequence?.description).toContain("impact analysis pending");
  });
});
describe("authorized gameplay projection",()=>{
  it.each(PLAYER_ROLES)("isolates %s Round 1 intel and hides numeric risk and dossiers",role=>{
    const state=discussion();state.hiddenMetrics.cascadeRisk=97.1234;
    const own=state.roleAssignments[role];const snapshot=crisisSnapshot(state,members,own,"TEST",time);const json=JSON.stringify(snapshot);
    expect(snapshot.ownIntel[0].text).toBe(BLACKOUT_SCENARIO.rounds[1].privateIntel[role].text);
    for(const intel of state.privateIntel.filter(value=>value.ownerPlayerId!==own))expect(json).not.toContain(JSON.stringify(intel.text).slice(1,-1));
    for(const definition of Object.values(BLACKOUT_ROLES))expect(json).not.toContain(definition.secret);
    expect(json).not.toMatch(/cascadeRisk|cascade_risk|hiddenMetrics|97\.1234|token_hash|roleAssignments|processedCommands/);
    expect(Object.keys(snapshot.metrics).sort()).toEqual(["economy","grid","safety","trust"]);
  });
  it("delivers shared intel to peers only after an authoritative share",()=>{
    let state=discussion();const intel=state.privateIntel.find(value=>value.ownerPlayerId===ids[0])!;
    expect(crisisSnapshot(state,members,ids[1],"TEST",time).sharedIntel).toEqual([]);
    state=step(state,{type:"share",ref:opaqueRef(intel.id)});
    expect(crisisSnapshot(state,members,ids[1],"TEST",time).sharedIntel[0].text).toBe(intel.text);
    expect(crisisSnapshot(state,members,ids[1],"TEST",time).ownIntel).toHaveLength(1);
  });
  it("reveals no numeric response effects before execution",()=>{
    const snapshot=crisisSnapshot(discussion(),members,ids[0],"TEST",time);
    expect(snapshot.responses).toHaveLength(3);expect(snapshot.consequence).toBeNull();expect(JSON.stringify(snapshot.responses)).not.toMatch(/effects|cascade|\+4|\-10/i);
  });
});
