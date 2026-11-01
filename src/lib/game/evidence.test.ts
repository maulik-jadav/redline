import { describe, expect, it } from "vitest";
import { advancePhase, shareEvidence, shareIntelligence, submitNormalVote, executeAbility } from "./index";
import { atRound, choose, nextRound, select } from "./test-fixtures";

describe("evidence and private intelligence", () => {
  it("delivers only discovered evidence with private ownership", () => {
    const h=atRound(1);
    expect(h.state.evidence.anonymous_s7_warning).toMatchObject({ownerPlayerId:"lena",visibility:"private",verification:"unverified"});
    expect(h.state.evidence.march_inspection_report).toBeUndefined();
    expect(h.state.privateIntel).toHaveLength(4);
    expect(h.state.privateIntel.map(item=>item.ownerPlayerId)).toEqual(["maya","elena","marcus","lena"]);
  });
  it("delivers the hospital report and deployment log automatically", () => {
    const h=atRound(4);
    expect(h.state.evidence.hospital_impact_report).toMatchObject({ownerPlayerId:"elena",visibility:"private",verification:"confirmed",discoveredRound:2});
    expect(h.state.evidence.oracle_build_7_4_deployment).toMatchObject({ownerPlayerId:"maya",visibility:"private",verification:"confirmed",discoveredRound:4});
    expect(h.state.evidence.anonymous_partial_march_report?.verification).toBe("unverified");
  });
  it("sharing preserves verification, rewards once, and cannot regress visibility", () => {
    const h=atRound(3);
    h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    const before=structuredClone(h.state);
    expect(shareEvidence(h.state,{playerId:"maya",evidenceKey:"march_inspection_report"},h.context())).toMatchObject({ok:false,error:{code:"EVIDENCE_UNAVAILABLE"}});
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    expect(before.evidence.march_inspection_report?.visibility).toBe("private");
    expect(h.state.evidence.march_inspection_report).toMatchObject({visibility:"shared",verification:"confirmed"});
    expect(h.state.contributions.marcus-before.contributions.marcus).toBe(5);
    expect(h.state.scenarioFlags.helixExposed).toBe(false);
    const snapshot=structuredClone(h.state);
    expect(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context())).toMatchObject({ok:false,error:{code:"EVIDENCE_ALREADY_SHARED"}});
    expect(h.state).toEqual(snapshot);
  });
  it("shares ordinary role intel idempotently and linked evidence without double reward", () => {
    const h=atRound(2); const intel=h.state.privateIntel.find(item=>item.round===2&&item.ownerPlayerId==="elena")!;
    const before=h.state.contributions.elena;
    h.apply(shareIntelligence(h.state,{playerId:"elena",intelId:intel.id},h.context()));
    expect(h.state.evidence.hospital_impact_report?.visibility).toBe("shared");
    expect(h.state.contributions.elena-before).toBe(5);
    expect(shareEvidence(h.state,{playerId:"elena",evidenceKey:"hospital_impact_report"},h.context()).ok).toBe(false);
    const plain=h.state.privateIntel.find(item=>item.round===2&&item.ownerPlayerId==="maya")!;
    h.apply(shareIntelligence(h.state,{playerId:"maya",intelId:plain.id},h.context()));
    expect(h.state.privateIntel.find(item=>item.id===plain.id)?.visibility).toBe("shared");
    expect(shareIntelligence(h.state,{playerId:"maya",intelId:plain.id},h.context()).ok).toBe(false);
  });
  it.each(["shared","public"] as const)("omits partial March report if the confirmed report is %s", visibility => {
    const h=atRound(3); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    if(visibility==="public") h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()));
    choose(h,"r3_isolate_s7"); nextRound(h);
    expect(h.state.evidence.anonymous_partial_march_report).toBeUndefined();
  });
  it("rejects evidence interaction during voting", () => {
    const h=atRound(1); select(h,"r1_reduce_sector_7_load");
    expect(shareEvidence(h.state,{playerId:"lena",evidenceKey:"anonymous_s7_warning"},h.context())).toMatchObject({ok:false,error:{code:"INVALID_PHASE"}});
  });
});

describe("abilities", () => {
  it("Diagnostic Scan requires the engineer, supported target, and eligible round", () => {
    const h=atRound(1);
    expect(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"sector_7"},h.context())).toMatchObject({ok:false,error:{code:"ABILITY_UNAVAILABLE"}});
    expect(executeAbility(h.state,{playerId:"marcus",abilityId:"diagnostic_scan",target:"sector_7"},h.context())).toMatchObject({ok:false,error:{code:"INVALID_ROLE"}});
    expect(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"north"},h.context())).toMatchObject({ok:false,error:{code:"INVALID_TARGET"}});
    expect(h.state.abilities.diagnostic_scan.remainingUses).toBe(3);
  });
  it("Diagnostic Scan discovers private confirmed evidence and exhausts configured uses", () => {
    const h=atRound(3);
    for(let i=0;i<3;i++) h.apply(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"sector_7"},h.context()));
    expect(h.state.evidence.transformer_degradation_analysis).toMatchObject({ownerPlayerId:"maya",visibility:"private",verification:"confirmed"});
    expect(h.state.abilities.diagnostic_scan.remainingUses).toBe(0);
    expect(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"sector_7"},h.context())).toMatchObject({ok:false,error:{code:"ABILITY_EXHAUSTED"}});
    expect(h.state.collaborationRewards.filter(key=>key.includes("usefulRoleAbility"))).toHaveLength(1);
  });
  it("Corporate Intel decrements one use and discovers the March report", () => {
    const h=atRound(3); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    expect(h.state.abilities.corporate_intel.remainingUses).toBe(1);
    expect(h.state.evidence.march_inspection_report?.verification).toBe("confirmed");
  });
  it("Emergency Order forces a pending proposal into voting without approving it", async () => {
    const { createProposal }=await import("./index");
    const h=atRound(1); h.apply(createProposal(h.state,{proposalId:"p",playerId:"maya",title:"Plan",action:"Investigate",reason:"Need facts"},h.context()));
    const before=h.state.version;
    h.apply(executeAbility(h.state,{playerId:"elena",abilityId:"emergency_order",proposalId:"p"},h.context()));
    expect(h.state.version).toBe(before+1); expect(h.state.phase).toBe("voting");
    expect(h.state.proposals.p.proposal.status).toBe("voting"); expect(h.state.votes.p).toEqual([]);
    expect(h.state.abilities.emergency_order.remainingUses).toBe(0);
  });
  it("invalid Emergency Order does not consume the ability or version", () => {
    const h=atRound(1); const snapshot=structuredClone(h.state);
    expect(executeAbility(h.state,{playerId:"elena",abilityId:"emergency_order",proposalId:"missing"},h.context()).ok).toBe(false);
    expect(h.state).toEqual(snapshot);
  });
  it("Breaking Leak cannot leak undiscovered or another player's private evidence", () => {
    const h=atRound(3);
    expect(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()).ok).toBe(false);
    h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    expect(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()).ok).toBe(false);
    expect(h.state.abilities.breaking_leak.remainingUses).toBe(1);
  });
  it("confirmed March publication exposes Helix and rewards publication once", () => {
    const h=atRound(3); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    const before=structuredClone(h.state);
    h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()));
    expect(h.state.metrics.trust).toBe(before.metrics.trust+7); expect(h.state.metrics.economy).toBe(before.metrics.economy-5);
    expect(h.state.scenarioFlags).toMatchObject({helixExposed:true,confirmedWrongdoingPublished:true});
    expect(h.state.evidence.march_inspection_report?.visibility).toBe("public");
    expect(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()).ok).toBe(false);
    expect(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context())).toMatchObject({ok:false,error:{code:"ABILITY_EXHAUSTED"}});
  });
  it("unverified publication damages trust without exposing Helix", () => {
    const h=atRound(1); const trust=h.state.metrics.trust;
    h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["anonymous_s7_warning"]},h.context()));
    expect(h.state.metrics.trust).toBe(trust-8); expect(h.state.scenarioFlags.helixExposed).toBe(false);
  });
});

describe("correlation, disclosure and suppression", () => {
  it("unlocks Path A once from two confirmed shared technical items", () => {
    const h=atRound(4);
    h.apply(executeAbility(h.state,{playerId:"maya",abilityId:"diagnostic_scan",target:"sector_7"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"maya",evidenceKey:"transformer_degradation_analysis"},h.context()));
    expect(h.state.scenarioFlags.trueCauseDiscovered).toBe(false);
    h.apply(shareEvidence(h.state,{playerId:"maya",evidenceKey:"oracle_build_7_4_deployment"},h.context()));
    expect(h.state.evidence.failure_correlation_analysis).toMatchObject({visibility:"shared",verification:"confirmed"});
    expect(h.state.scenarioFlags.trueCauseDiscovered).toBe(true);
    const id=h.state.evidence.failure_correlation_analysis?.id;
    choose(h,"r4_independent_investigation");
    expect(h.state.evidence.failure_correlation_analysis?.id).toBe(id);
    expect(h.state.timeline.filter(entry=>entry.evidenceKeys?.includes("failure_correlation_analysis"))).toHaveLength(1);
  });
  it("unlocks Path B through successful investigation plus a shared March report", () => {
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    expect(h.state.scenarioFlags.trueCauseDiscovered).toBe(false);
    choose(h,"r4_independent_investigation"); expect(h.state.scenarioFlags.trueCauseDiscovered).toBe(true);
  });
  it("does not unlock investigation when evidence remains private", () => {
    const h=atRound(4); choose(h,"r4_independent_investigation");
    expect(h.state.scenarioFlags.trueCauseDiscovered).toBe(false);
  });
  it("discloses multiple items with only the strongest category's consequence", () => {
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    const before=structuredClone(h.state);
    choose(h,"r4_publicly_disclose_known_evidence",["march_inspection_report","hospital_impact_report"]);
    expect(h.state.metrics.trust).toBe(before.metrics.trust+7); expect(h.state.metrics.economy).toBe(before.metrics.economy-5);
    expect(h.state.evidence.hospital_impact_report?.visibility).toBe("public");
    expect(h.state.evidence.march_inspection_report?.visibility).toBe("public");
  });
  it("confirmed non-Helix disclosure uses its separate category", () => {
    const h=atRound(4); const before=structuredClone(h.state);
    choose(h,"r4_publicly_disclose_known_evidence",["oracle_build_7_4_deployment"],"maya");
    expect(h.state.metrics.trust).toBe(before.metrics.trust+4); expect(h.state.metrics.economy).toBe(before.metrics.economy-3);
    expect(h.state.scenarioFlags.helixExposed).toBe(false);
  });
  it("snapshots suppression evidence and applies later exposure penalty once", () => {
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    const before=structuredClone(h.state); choose(h,"r4_suppress_information_until_crisis_ends");
    expect(h.state.metrics.trust).toBe(before.metrics.trust+1); expect(h.state.metrics.economy).toBe(before.metrics.economy+2);
    expect(h.state.suppressionEvidence).toContain("march_inspection_report");
    expect(h.state.suppressionEvidence).not.toContain("oracle_build_7_4_deployment");
    nextRound(h); const trust=h.state.metrics.trust;
    h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()));
    expect(h.state.metrics.trust).toBe(trust+7-12);
    expect(h.state.scenarioFlags.suppressionExposed).toBe(true);
    expect(h.state.timeline.filter(entry=>entry.type==="suppression_exposed")).toHaveLength(1);
    const snapshot=structuredClone(h.state);
    expect(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["march_inspection_report"]},h.context()).ok).toBe(false);
    expect(h.state).toEqual(snapshot);
  });
  it("does not expose suppression for evidence unavailable to the room at suppression", () => {
    const h=atRound(4); choose(h,"r4_suppress_information_until_crisis_ends"); nextRound(h);
    h.apply(shareEvidence(h.state,{playerId:"maya",evidenceKey:"oracle_build_7_4_deployment"},h.context()));
    h.apply(executeAbility(h.state,{playerId:"lena",abilityId:"breaking_leak",evidenceKeys:["oracle_build_7_4_deployment"]},h.context()));
    expect(h.state.scenarioFlags.suppressionExposed).toBe(false);
  });
  it("caps collaboration while preserving per-player participation and prevents duplicates", () => {
    const h=atRound(1); const id=select(h,"r1_investigate_before_acting"); h.state.collaborationScore=99;
    h.apply(submitNormalVote(h.state,{proposalId:id,playerId:"maya",choice:"approve"},h.context()));
    expect(h.state.collaborationScore).toBe(100); expect(h.state.contributions.maya).toBe(2);
    expect(submitNormalVote(h.state,{proposalId:id,playerId:"maya",choice:"approve"},h.context()).ok).toBe(false);
    expect(h.state.contributions.maya).toBe(2);
  });
  it("cannot advance voting via generic phase commands", () => {
    const h=atRound(1); select(h,"r1_investigate_before_acting");
    expect(advancePhase(h.state,h.context()).ok).toBe(false);
  });
});
