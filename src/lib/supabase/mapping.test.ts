import { describe, expect, it } from "vitest";
import { executeAbility, shareEvidence } from "@/lib/game";
import { atRound, choose, harness, nextRound } from "@/lib/game/test-fixtures";
import { evidenceFromRow, fromPersistenceSnapshot, gameStateToRow, rowToGameState, toPersistenceSnapshot } from "./mapping";

const time="2042-03-01T00:00:00.000Z";
describe("engine/database mappings",()=>{
  it("maps database-shaped scalar state into domain fields",()=>{
    const h=harness(); const row=gameStateToRow(h.state,time);
    expect(row).toMatchObject({room_id:"room",grid:72,cascade_risk:24,collaboration_score:50,version:0});
    expect(rowToGameState({...row,version:42,grid:61,helix_exposed:true})).toMatchObject({roomId:"room",metrics:{grid:61},scenarioFlags:{helixExposed:true},version:42});
  });
  it("uses SQL null for absent pre-round fields and restores absence",()=>{
    const state=harness().state; const snapshot=toPersistenceSnapshot(state,time);
    expect(snapshot.game_state).toMatchObject({round:null,selected_proposal_id:null,active_event_id:null,started_at:null,completed_at:null,phase_ends_at:null});
    const loaded=fromPersistenceSnapshot(snapshot);
    expect(loaded).toEqual(state); expect(Object.hasOwn(loaded,"round")).toBe(false);
    expect(Object.hasOwn(loaded,"selectedProposalId")).toBe(false);
  });
  it("round-trips every scenario flag and the exact revision",()=>{
    const h=harness(); h.state.version=37;
    for(const key of Object.keys(h.state.scenarioFlags) as (keyof typeof h.state.scenarioFlags)[]) h.state.scenarioFlags[key]=true;
    const loaded=fromPersistenceSnapshot(toPersistenceSnapshot(h.state,time));
    expect(loaded.scenarioFlags).toEqual(h.state.scenarioFlags); expect(loaded.version).toBe(37);
  });
  it("keeps private confirmed evidence independent of visibility",()=>{
    const h=atRound(3); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    const row=toPersistenceSnapshot(h.state,time).evidence.find(row=>row.key==="march_inspection_report")!;
    expect(evidenceFromRow(row)).toEqual(h.state.evidence.march_inspection_report);
    expect(row.visibility).toBe("private"); expect(row.verification).toBe("confirmed");
  });
  it("preserves complete runtime collections, proposal provenance and reward ledgers",()=>{
    const h=atRound(4); h.apply(executeAbility(h.state,{playerId:"marcus",abilityId:"corporate_intel"},h.context()));
    h.apply(shareEvidence(h.state,{playerId:"marcus",evidenceKey:"march_inspection_report"},h.context()));
    choose(h,"r4_suppress_information_until_crisis_ends"); nextRound(h);
    const snapshot=toPersistenceSnapshot(h.state,time);
    snapshot.timeline.reverse(); snapshot.events.reverse(); snapshot.processed_commands.reverse(); snapshot.collaboration_rewards.reverse();
    expect(fromPersistenceSnapshot(snapshot)).toEqual(h.state);
    expect(snapshot.game_state.suppression_evidence_snapshot).toContain("march_inspection_report");
  });
  it("stores linked intel content once and reconstructs it",()=>{
    const h=atRound(2); const snapshot=toPersistenceSnapshot(h.state,time);
    const linked=snapshot.private_intel.find(row=>row.evidence_key==="hospital_impact_report")!;
    expect(linked.content).toBeNull();
    expect(fromPersistenceSnapshot(snapshot).privateIntel).toEqual(h.state.privateIntel);
    snapshot.evidence=[]; expect(()=>fromPersistenceSnapshot(snapshot)).toThrow("Missing intelligence content");
  });
  it("keeps mapped objects independent of caller state",()=>{
    const h=atRound(3); const original=structuredClone(h.state); const snapshot=toPersistenceSnapshot(h.state,time);
    snapshot.game_state.map.transit="offline"; snapshot.game_state.contributions.maya=999;
    expect(h.state).toEqual(original);
    const loaded=fromPersistenceSnapshot(toPersistenceSnapshot(h.state,time)); loaded.timeline[0].message="changed";
    expect(h.state).toEqual(original);
  });
  it("normalizes timezone-aware database timestamps to ISO UTC",()=>{
    const row=gameStateToRow(harness().state,time); row.started_at="2042-03-01T02:00:00+02:00";
    expect(rowToGameState(row).startedAt).toBe(time);
  });
});
