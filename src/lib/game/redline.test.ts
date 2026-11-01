import { describe, expect, it } from "vitest";
import { advancePhase, buildGameResult, createCanonicalProposal, createProposal, enterRedlineProtocol, finalizeNormalVote, finalizeRedlineDeadlock,
  selectProposal, shareEvidence, submitNormalVote, submitRedlineSelection, executeAbility } from "./index";
import { assignments, atRound, boot, choose, harness, nextRound } from "./test-fixtures";

describe("REDLINE ballot", () => {
  it("rejects entry before Round 5 and normal proposals in Round 5", () => {
    const h=atRound(1); expect(enterRedlineProtocol(h.state,h.context()).ok).toBe(false);
    const final=atRound(5);
    expect(createProposal(final.state,{proposalId:"p",playerId:"maya",title:"Plan",action:"Wait",reason:"Test"},final.context()).ok).toBe(false);
  });
  it("replaces a selection without duplicating participation rewards", () => {
    const h=atRound(5); h.apply(enterRedlineProtocol(h.state,h.context()));
    h.apply(submitRedlineSelection(h.state,{playerId:"maya",choice:"total_grid_shutdown"},h.context()));
    const score=h.state.collaborationScore;
    h.apply(submitRedlineSelection(h.state,{playerId:"maya",choice:"manual_takeover"},h.context()));
    expect(h.state.redlineSelections).toEqual({maya:"manual_takeover"}); expect(h.state.collaborationScore).toBe(score);
    expect(submitRedlineSelection(h.state,{playerId:"outsider",choice:"manual_takeover"},h.context()).ok).toBe(false);
  });
  it.each([true,false])("Trust ORACLE consumes the S7 isolated=%s branch once", isolated => {
    const h=atRound(5); h.state.scenarioFlags.s7Isolated=isolated;
    h.state.metrics={grid:50,safety:50,economy:50,trust:50}; h.state.hiddenMetrics.cascadeRisk=40;
    h.apply(enterRedlineProtocol(h.state,h.context()));
    for(const playerId of ["maya","elena","marcus"]) h.apply(submitRedlineSelection(h.state,{playerId,choice:"trust_oracle"},h.context()));
    expect(h.state.metrics).toEqual(isolated?{grid:68,safety:58,economy:55,trust:54}:{grid:30,safety:35,economy:40,trust:40});
    expect(h.state.hiddenMetrics.cascadeRisk).toBe(isolated?15:70);
    expect(h.state).toMatchObject({status:"completed",phase:"results",redlineResolution:"trust_oracle"});
    const snapshot=structuredClone(h.state);
    expect(submitRedlineSelection(h.state,{playerId:"lena",choice:"trust_oracle"},h.context())).toMatchObject({ok:false,error:{code:"GAME_ALREADY_COMPLETED"}});
    expect(finalizeRedlineDeadlock(h.state,h.context()).ok).toBe(false); expect(h.state).toEqual(snapshot);
  });
  it("timeout deadlock applies +25 before ending evaluation, once", () => {
    const h=atRound(5); h.state.hiddenMetrics.cascadeRisk=80;
    h.apply(enterRedlineProtocol(h.state,h.context()));
    h.apply(submitRedlineSelection(h.state,{playerId:"maya",choice:"manual_takeover"},h.context()));
    const version=h.state.version;
    h.apply(finalizeRedlineDeadlock(h.state,h.context()));
    expect(h.state.version).toBe(version+1); expect(h.state.hiddenMetrics.cascadeRisk).toBe(100);
    expect(h.state.result?.ending).toBe("catastrophic_cascade");
    expect(finalizeRedlineDeadlock(h.state,h.context()).ok).toBe(false);
  });
  it("cannot build premature results", () => expect(()=>buildGameResult(harness().state)).toThrow());
  it.each(["total_grid_shutdown","manual_takeover"] as const)("executes fixed final option %s", choice => {
    const h=atRound(5); h.state.metrics={grid:50,safety:50,economy:50,trust:50}; h.state.hiddenMetrics.cascadeRisk=50;
    h.apply(enterRedlineProtocol(h.state,h.context()));
    for(const playerId of ["maya","elena","marcus"]) h.apply(submitRedlineSelection(h.state,{playerId,choice},h.context()));
    expect(h.state.metrics).toEqual(choice==="total_grid_shutdown"?{grid:70,safety:42,economy:32,trust:45}:{grid:58,safety:64,economy:42,trust:56});
    expect(h.state.hiddenMetrics.cascadeRisk).toBe(choice==="total_grid_shutdown"?10:32);
  });
});

describe("complete deterministic in-memory simulations", () => {
  it("saves the city, exposes the truth, and produces the exact score and history", () => {
    const h=harness(); boot(h);
    choose(h,"r1_reduce_sector_7_load"); nextRound(h);
    choose(h,"r2_reroute_industrial_power"); nextRound(h);
    h.apply(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"sector_7"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"maya",evidenceKey:"transformer_degradation_analysis"},h.context()));
    h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    choose(h,"r3_isolate_s7"); nextRound(h);
    h.apply(shareEvidence(h.state,{playerId:"maya",evidenceKey:"oracle_build_7_4_deployment"},h.context()));
    h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()));
    choose(h,"r4_independent_investigation"); nextRound(h);
    h.apply(advancePhase(h.state,h.context()));
    for(const playerId of ["maya","elena","marcus"]) h.apply(submitRedlineSelection(h.state,{playerId,choice:"trust_oracle"},h.context()));
    expect(h.state.phase).toBe("results"); expect(h.state.status).toBe("completed");
    expect(h.state.result).toMatchObject({ending:"miracle_recovery",teamScore:8310,grade:"A",
      finalMetrics:{grid:86,safety:94,economy:37,trust:79},finalCascadeRisk:0,collaborationScore:100,specialAchievements:["truth_exposed"]});
    expect(h.state.result?.personalObjectives.find(result=>result.playerId===assignments.journalist)).toMatchObject({completed:true,bonusCompleted:true});
    expect(h.state.result?.personalObjectives.find(result=>result.playerId===assignments.executive)?.completed).toBe(false);
    expect(h.state.result?.personalObjectives.find(result=>result.playerId===assignments.engineer)?.bonusCompleted).toBeUndefined();
    expect(h.state.result?.awards).toEqual([]);
    for(const type of ["game_start","round_start","intelligence_shared","ability_used","proposal_selected","vote_outcome","decision_executed","public_disclosure","helix_exposed","redline_activated","final_vote","ending"]) {
      expect(h.state.timeline.some(entry=>entry.type===type),type).toBe(true);
    }
    expect(h.state.timeline.filter(entry=>entry.type==="round_start")).toHaveLength(5);
    expect(new Set(h.state.timeline.map(entry=>entry.id)).size).toBe(h.state.timeline.length);
    expect(JSON.parse(JSON.stringify(h.state))).toEqual(h.state);
  });
  it("dangerous canonical decisions collapse the grid without external services", () => {
    const h=harness(); boot(h);
    choose(h,"r1_maintain_normal_operations"); nextRound(h);
    choose(h,"r2_reroute_industrial_power"); nextRound(h);
    choose(h,"r3_keep_s7_online"); nextRound(h);
    choose(h,"r4_suppress_information_until_crisis_ends"); nextRound(h);
    h.apply(enterRedlineProtocol(h.state,h.context()));
    for(const playerId of ["maya","elena","marcus"]) h.apply(submitRedlineSelection(h.state,{playerId,choice:"trust_oracle"},h.context()));
    expect(h.state.result).toMatchObject({ending:"grid_collapse",teamScore:5730,grade:"D",finalCascadeRisk:98});
    expect(h.state.phase).toBe("results");
  });
  it("canonical publication attributes Lena's bonus to her actual approval", () => {
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    choose(h,"r4_publicly_disclose_known_evidence",["march_inspection_report"]); nextRound(h);
    h.apply(enterRedlineProtocol(h.state,h.context())); h.apply(finalizeRedlineDeadlock(h.state,h.context()));
    expect(h.state.result?.personalObjectives.find(result=>result.role==="journalist")?.bonusCompleted).toBe(true);
  });
  it("records Lena's initiation independently of canonical proposal creator rewards", () => {
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    h.apply(createCanonicalProposal(h.state,{proposalId:"publication",playerId:"lena",responseId:"r4_publicly_disclose_known_evidence",evidenceKeys:["march_inspection_report"]},h.context()));
    h.apply(selectProposal(h.state,{proposalId:"publication",actor:{playerId:"elena",isHost:true}},h.context()));
    for(const playerId of ["maya","elena","marcus","lena"]) h.apply(submitNormalVote(h.state,{proposalId:"publication",playerId,choice:playerId==="lena"?"reject":"approve"},h.context()));
    h.apply(finalizeNormalVote(h.state,{reason:"all_votes"},h.context()));
    expect(h.state.timeline.find(entry=>entry.type==="public_disclosure")?.participantIds).toContain("lena");
    expect(h.state.collaborationRewards.some(key=>key.includes("successfulPlayerProposal"))).toBe(false);
  });
});
