import { describe, expect, it } from "vitest";
import { advancePhase, createCanonicalProposal, createProposal, finalizeNormalVote,
  selectDefaultResponse, selectProposal, submitNormalVote } from "./index";
import { atRound, choose, players, select } from "./test-fixtures";

describe("proposals and normal votes", () => {
  it("passes with three approvals and missing timeout vote", () => {
    const h=atRound(1); const id=select(h,"r1_reduce_sector_7_load");
    const before=h.state.metrics.grid;
    for(const playerId of players.slice(0,3)) h.apply(submitNormalVote(h.state,{proposalId:id,playerId,choice:"approve"},h.context()));
    h.apply(finalizeNormalVote(h.state,{reason:"timeout"},h.context()));
    expect(h.state.proposals[id].proposal.status).toBe("executed");
    expect(h.state.metrics.grid).toBe(before+4); expect(h.state.phase).toBe("consequence");
  });
  it("fails a 2/2 split and applies inaction once", () => {
    const h=atRound(1); const before=structuredClone(h.state);
    choose(h,"r1_reduce_sector_7_load",[],"elena",players.slice(0,2));
    expect(h.state.metrics.grid).toBe(before.metrics.grid-2);
    expect(h.state.hiddenMetrics.cascadeRisk).toBe(before.hiddenMetrics.cascadeRisk+6);
    const snapshot=structuredClone(h.state);
    expect(finalizeNormalVote(h.state,{reason:"timeout"},h.context()).ok).toBe(false);
    expect(h.state).toEqual(snapshot);
  });
  it.each([0,1])("fails with %s approval at timeout", approvals => {
    const h=atRound(1); const id=select(h,"r1_reduce_sector_7_load");
    for(const playerId of players.slice(0,approvals)) h.apply(submitNormalVote(h.state,{proposalId:id,playerId,choice:"approve"},h.context()));
    h.apply(finalizeNormalVote(h.state,{reason:"timeout"},h.context()));
    expect(h.state.proposals[id].proposal.status).toBe("rejected");
  });
  it.each([2,3,4] as const)("applies Round %s inaction from its scenario definition", round => {
    const h=atRound(round); const before=structuredClone(h.state);
    const response = round===2 ? "r2_emergency_generators_only" : round===3 ? "r3_redistribute_through_oracle" : "r4_independent_investigation";
    choose(h,response,[],"elena",[]);
    if(round===2) {
      expect(h.state.metrics.safety).toBe(before.metrics.safety-4);
      expect(h.state.metrics.trust).toBe(before.metrics.trust-2);
      expect(h.state.hiddenMetrics.cascadeRisk).toBe(before.hiddenMetrics.cascadeRisk+4);
    } else if(round===3) {
      expect(h.state.metrics.grid).toBe(before.metrics.grid-5);
      expect(h.state.metrics.safety).toBe(before.metrics.safety-3);
      expect(h.state.hiddenMetrics.cascadeRisk).toBe(before.hiddenMetrics.cascadeRisk+10);
    } else expect(h.state.metrics.trust).toBe(before.metrics.trust-3);
  });
  it("rejects duplicate votes, wrong players, wrong proposals and premature all-votes finalization", () => {
    const h=atRound(1); const id=select(h,"r1_reduce_sector_7_load");
    h.apply(submitNormalVote(h.state,{proposalId:id,playerId:"maya",choice:"approve"},h.context()));
    const before=structuredClone(h.state);
    expect(submitNormalVote(h.state,{proposalId:id,playerId:"maya",choice:"reject"},h.context())).toMatchObject({ok:false,error:{code:"ALREADY_VOTED"}});
    expect(submitNormalVote(h.state,{proposalId:id,playerId:"stranger",choice:"approve"},h.context())).toMatchObject({ok:false,error:{code:"INVALID_PLAYER"}});
    expect(submitNormalVote(h.state,{proposalId:"wrong",playerId:"lena",choice:"approve"},h.context()).ok).toBe(false);
    expect(finalizeNormalVote(h.state,{reason:"all_votes"},h.context()).ok).toBe(false);
    expect(h.state).toEqual(before);
  });
  it("allows one active proposal per creator, requires host selection, and locks selection", () => {
    const h=atRound(1); const input={proposalId:"p",playerId:"maya",title:"Plan",action:"Investigate",reason:"Need facts"};
    h.apply(createProposal(h.state,input,h.context()));
    expect(createProposal(h.state,{...input,proposalId:"other"},h.context()).ok).toBe(false);
    expect(selectProposal(h.state,{proposalId:"p",actor:{playerId:"maya"}},h.context()).ok).toBe(false);
    h.apply(selectProposal(h.state,{proposalId:"p",actor:{playerId:"elena",isHost:true}},h.context()));
    expect(selectProposal(h.state,{proposalId:"p",actor:{playerId:"elena",isHost:true}},h.context()).ok).toBe(false);
  });
  it("approved player proposals remain effectless but earn their creator reward", () => {
    const h=atRound(1); const input={proposalId:"p",playerId:"maya",title:"Plan",action:"Unclassified text",reason:"Test"};
    h.apply(createProposal(h.state,input,h.context()));
    h.apply(selectProposal(h.state,{proposalId:"p",actor:{playerId:"elena",isHost:true}},h.context()));
    const before=structuredClone(h.state);
    for(const playerId of players) h.apply(submitNormalVote(h.state,{proposalId:"p",playerId,choice:"approve"},h.context()));
    h.apply(finalizeNormalVote(h.state,{reason:"all_votes"},h.context()));
    expect(h.state.proposals.p.proposal.status).toBe("approved");
    expect(h.state.metrics).toEqual(before.metrics); expect(h.state.hiddenMetrics).toEqual(before.hiddenMetrics);
    expect(h.state.collaborationScore).toBe(before.collaborationScore+8+3);
  });
  it("uses deterministic timeout defaults without a host or proposals", () => {
    const h=atRound(1); h.apply(advancePhase(h.state,h.context()));
    h.apply(selectDefaultResponse(h.state,{proposalId:"default"},h.context()));
    expect(h.state.proposals.default.canonicalResponseId).toBe("r1_investigate_before_acting");
    h.apply(finalizeNormalVote(h.state,{reason:"timeout"},h.context()));
    expect(h.state.phase).toBe("consequence");
  });
  it("expires unselected proposals and rejects responses from other rounds", () => {
    const h=atRound(1);
    h.apply(createProposal(h.state,{proposalId:"unused",playerId:"marcus",title:"Plan",action:"Wait",reason:"Costs"},h.context()));
    expect(createCanonicalProposal(h.state,{proposalId:"bad",playerId:"maya",responseId:"r3_isolate_s7"},h.context()).ok).toBe(false);
    choose(h,"r1_investigate_before_acting");
    expect(h.state.proposals.unused.proposal.status).toBe("expired");
    expect(h.state.collaborationRewards.some(key=>key.includes("successfulPlayerProposal"))).toBe(false);
  });
  it("rejects empty disclosure before voting can lock", () => {
    const h=atRound(4);
    h.apply(createCanonicalProposal(h.state,{proposalId:"disclose",playerId:"elena",responseId:"r4_publicly_disclose_known_evidence"},h.context()));
    expect(selectProposal(h.state,{proposalId:"disclose",actor:{playerId:"elena",isHost:true}},h.context())).toMatchObject({ok:false,error:{code:"EVIDENCE_UNAVAILABLE"}});
    expect(h.state.phase).toBe("discussion");
    choose(h,"r4_independent_investigation"); expect(h.state.phase).toBe("consequence");
  });
});
