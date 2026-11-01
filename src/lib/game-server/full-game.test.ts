import { describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { playMatch,fullStep } from "./full-game.test-support";
import { members,ids } from "./fixtures.test-support";
import { crisisSnapshot,opaqueRef } from "./snapshots";
import { resultsPayload } from "./results";
import { BLACKOUT_ROLES,BLACKOUT_SCENARIO } from "@/data/blackout";
import { finalizeNormalVote } from "@/lib/game";
describe("complete BLACKOUT",()=>{
  it.each(["truth","concealment","failure"] as const)("completes %s path with persisted-result-ready data",path=>{
    const state=playMatch(path);expect(state.status).toBe("completed");expect(state.phase).toBe("results");expect(state.resolvedRounds).toEqual([1,2,3,4,5]);
    expect(state.result?.teamScore).toBeGreaterThanOrEqual(0);expect(state.result?.grade).toBeDefined();expect(state.result?.personalObjectives).toHaveLength(4);expect(state.timeline.filter(row=>row.type==="ending")).toHaveLength(1);
    const result=resultsPayload(state,members,ids[0],"TEST");expect(result.files).toHaveLength(4);expect(result.teamScore).toBe(state.result?.teamScore);expect(result.timeline).toHaveLength(state.timeline.length);
    if(path==="truth"){expect(state.result?.specialAchievements).toContain("truth_exposed");expect(state.evidence.failure_correlation_analysis?.verification).toBe("confirmed");expect(state.scenarioFlags.helixExposed).toBe(true);}
    if(path==="concealment"){expect(state.scenarioFlags.helixExposed).toBe(false);expect(state.result?.personalObjectives.find(value=>value.role==="executive")?.completed).toBe(state.metrics.economy>=55);}
    if(path==="failure")expect(state.result?.ending).toBe("grid_collapse");
  });
  it("isolates every role's current/discovered intelligence across all rounds and gates results secrets",()=>{
    playMatch("truth",(before,plan)=>{
      if(before.status!=="completed")expect(()=>resultsPayload(before,members,ids[0],"TEST")).toThrow();
      for(const state of plan.states){for(const member of members){const snapshot=crisisSnapshot(state,members,member.id,"TEST",state.phaseEndsAt!);const json=JSON.stringify(snapshot);
        for(const intel of state.privateIntel.filter(value=>value.ownerPlayerId!==member.id&&value.visibility==="private"))expect(json).not.toContain(JSON.stringify(intel.text).slice(1,-1));
        for(const evidence of Object.values(state.evidence).filter(value=>value&&value.ownerPlayerId!==member.id&&value.visibility==="private"))expect(json).not.toContain(JSON.stringify(evidence!.description).slice(1,-1));
        for(const definition of Object.values(BLACKOUT_ROLES))expect(json).not.toContain(definition.secret);
        expect(json).not.toMatch(/cascadeRisk|cascade_risk|hiddenMetrics|roleAssignments/);
        expect(snapshot.ownIntel.every(value=>state.privateIntel.some(intel=>opaqueRef(intel.id)===value.ref&&intel.round<=(state.round??0)))).toBe(true);
        if((state.round??0)<3)expect(json).not.toContain(BLACKOUT_SCENARIO.evidence.march_inspection_report.content);
      }}
    });
  });
  it.each(["total_grid_shutdown","trust_oracle","manual_takeover","deadlock"] as const)("resolves REDLINE %s once with selectable current ballots",choice=>{
    let finalState=playMatch("truth");let open=finalState;
    playMatch("truth",(before)=>{if(before.phase==="redline_protocol")open=structuredClone(before);});
    open.redlineSelections={};open.redlineResolution=undefined;open.result=undefined;open.status="active";open.phase="redline_protocol";
    if(choice==="deadlock")finalState=fullStep(open,{type:"timeout"}).states[0];
    else {let state=fullStep(open,{type:"redline",choice:"manual_takeover"},ids[0]).states[0];state=fullStep(state,{type:"redline",choice},ids[0]).states[0];for(const actor of ids.slice(1,3))state=fullStep(state,{type:"redline",choice},actor).states[0];finalState=state;}
    expect(finalState.status).toBe("completed");expect(finalState.redlineResolution).toBe(choice);expect(finalState.resolvedRounds.filter(value=>value===5)).toHaveLength(1);
  });
  it("enforces bounded custom effects independently of provider validation",()=>{
    let voting=playMatch("truth");playMatch("truth",before=>{if(before.phase==="voting")voting=structuredClone(before);});
    const selected=voting.proposals[voting.selectedProposalId!];selected.proposal={...selected.proposal,source:"player",creatorPlayerId:ids[0]};delete selected.canonicalResponseId;
    voting.votes[voting.selectedProposalId!]=ids.slice(0,3).map(playerId=>({playerId,proposalId:voting.selectedProposalId!,choice:"approve" as const}));
    expect(finalizeNormalVote(voting,{reason:"approval_threshold",customEffects:{grid:16}},{commandId:"unsafe",occurredAt:"2042-01-01T00:01:00Z"}).ok).toBe(false);
    const valid=finalizeNormalVote(voting,{reason:"approval_threshold",customEffects:{grid:3}},{commandId:"safe",occurredAt:"2042-01-01T00:01:00Z"});expect(valid.ok).toBe(true);
  });
});
