import { describe, expect, it } from "vitest";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import { advancePhase, applyMetricEffects, calculateGrade, calculateTeamScore, clampMetric,
  createGame, evaluateEnding, roundHalfAwayFromZero, startGame, startRound, submitNormalVote } from "./index";
import { accepted, assignments, atRound, boot, choose, harness } from "./test-fixtures";

describe("creation and command integrity", () => {
  it("initializes canonical independent state and four distinct roles", () => {
    const state = createGame({ roomId: "room", mode: "standard", roleAssignments: assignments });
    expect(state).toMatchObject({ metrics: { grid: 72, safety: 84, economy: 76, trust: 68 },
      hiddenMetrics: { cascadeRisk: 24 }, collaborationScore: 50, status: "waiting", phase: "lobby", version: 0 });
    expect(state.round).toBeUndefined();
    expect(Object.values(state.scenarioFlags)).toEqual([false, false, false, false, false, false]);
    state.metrics.grid = 0;
    expect(BLACKOUT_SCENARIO.initialState.metrics.grid).toBe(72);
    expect(() => createGame({ roomId: "room", mode: "standard", roleAssignments: { ...assignments, mayor: "maya" } })).toThrow();
  });
  it("changes version exactly once, preserves the caller, and uses caller time", () => {
    const h = harness(); const before = structuredClone(h.state); const context = h.context();
    const next = accepted(startGame(h.state, context));
    expect(h.state).toEqual(before); expect(next.version).toBe(1);
    expect(next.timeline[0].occurredAt).toBe(context.occurredAt);
    expect(next.timeline[0].id.startsWith(context.commandId)).toBe(true);
    expect(next.startedAt).toBe(context.occurredAt);
  });
  it("rejects stale versions without changing state", () => {
    const h = harness(); const before = structuredClone(h.state);
    expect(startGame(h.state, { ...h.context(), expectedVersion: 99 })).toMatchObject({ ok: false, error: { code: "VERSION_CONFLICT" } });
    expect(h.state).toEqual(before);
  });
  it("is repeatable and accepts deeply frozen caller state", () => {
    const h=harness();
    function freeze(value: object): void {
      Object.freeze(value);
      for(const nested of Object.values(value)) if(nested && typeof nested === "object") freeze(nested);
    }
    freeze(h.state);
    const context=h.context();
    expect(startGame(h.state,context)).toEqual(startGame(h.state,context));
    expect(h.state.version).toBe(0); expect(h.state.timeline).toEqual([]);
  });
  it("rejects command replay and invalid timestamps atomically", () => {
    const h = harness(); const context = h.context(); h.apply(startGame(h.state, context));
    expect(advancePhase(h.state, context)).toMatchObject({ ok: false, error: { code: "COMMAND_ALREADY_APPLIED" } });
    expect(advancePhase(h.state, { ...h.context(), occurredAt: "invalid" })).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(h.state.version).toBe(1);
  });
  it("does not permit voting in lobby or arbitrary phase skipping", () => {
    const h = harness();
    expect(submitNormalVote(h.state, { proposalId: "p", playerId: "maya", choice: "approve" }, h.context())).toMatchObject({ ok: false, error: { code: "INVALID_PHASE" } });
    expect(advancePhase(h.state, h.context()).ok).toBe(false);
    boot(h);
    expect(startRound(h.state, { round: 3 }, h.context()).ok).toBe(false);
  });
});

describe("metric boundaries and rounding", () => {
  it.each([[150,100],[-20,0],[55,55]])("clamps %s to %s", (value, expected) => expect(clampMetric(value)).toBe(expected));
  it.each([NaN, Infinity, -Infinity])("rejects nonfinite metric %s", value => expect(() => clampMetric(value)).toThrow());
  it("returns independent values without modifying metrics or effects", () => {
    const metrics = Object.freeze({ grid: 95, safety: 1, economy: 20, trust: 30 });
    const hidden = Object.freeze({ cascadeRisk: 95 });
    const effects = Object.freeze({ grid: 20, safety: -50, cascadeRisk: 20 });
    expect(applyMetricEffects(metrics, hidden, effects)).toEqual({ metrics: { grid: 100, safety: 0, economy: 20, trust: 30 }, hiddenMetrics: { cascadeRisk: 100 } });
    expect(effects.grid).toBe(20); expect(metrics.grid).toBe(95);
  });
  it.each([[12.5,13],[-12.5,-13],[7.4,7],[-7.4,-7],[0,0],[-0.4,0]])("rounds %s to %s", (value, expected) => expect(roundHalfAwayFromZero(value)).toBe(expected));
});

describe("round effects", () => {
  it.each([[39,-5,-2],[40,-7,-3],[69,-7,-3],[70,-10,-5]])("Round 2 samples pre-event risk %s", (risk, safety, trust) => {
    const h = atRound(1); choose(h, "r1_investigate_before_acting");
    h.state.hiddenMetrics.cascadeRisk = risk;
    const before = structuredClone(h.state);
    h.apply(startRound(h.state, { round: 2 }, h.context()));
    expect(h.state.metrics.safety).toBe(before.metrics.safety + safety);
    expect(h.state.metrics.trust).toBe(before.metrics.trust + trust);
    expect(h.state.events.at(-1)?.metricEffects).toEqual({ safety, trust });
  });
  it.each([[49,-8,-5,-5,-3,8],[50,-10,-7,-6,-4,10],[74,-10,-7,-6,-4,10],[75,-13,-9,-8,-5,13]])("Round 5 samples pre-event risk %s", (risk,grid,safety,economy,trust,cascadeRisk) => {
    const h = atRound(4); choose(h, "r4_independent_investigation");
    h.state.hiddenMetrics.cascadeRisk = risk;
    const before = structuredClone(h.state);
    h.apply(startRound(h.state, { round: 5 }, h.context()));
    expect(h.state.events.find(event => event.round === 5 && event.type === "round_event")?.metricEffects).toEqual({ grid,safety,economy,trust,cascadeRisk });
    expect(h.state.hiddenMetrics.cascadeRisk).toBe(Math.min(100,risk+cascadeRisk));
    expect(h.state.metrics.grid).toBe(Math.max(0,before.metrics.grid+grid));
  });
  it("applies Round 3 event once, isolates S7 once, and separates Transit", () => {
    const h = atRound(3); const before = structuredClone(h.state);
    expect(h.state.map.transit).toBe("critical"); expect(h.state.map.sectors.sector_7).toBe("critical");
    expect(startRound(h.state, { round: 3 }, h.context()).ok).toBe(false);
    choose(h, "r3_isolate_s7"); expect(h.state.scenarioFlags.s7Isolated).toBe(true);
    expect(h.state.metrics.grid).toBe(Math.min(100,before.metrics.grid+10));
    expect(h.state.executedResponses.filter(id=>id==="r3_isolate_s7")).toHaveLength(1);
  });
});

describe("endings and scores", () => {
  it.each([
    [80,90,100,"catastrophic_cascade"], [34,90,99,"grid_collapse"], [35,39,99,"humanitarian_disaster"],
    [70,75,30,"miracle_recovery"], [55,60,69,"city_saved"], [35,40,99,"pyrrhic_victory"],
    [70,75,31,"city_saved"], [55,60,70,"pyrrhic_victory"], [34,39,100,"catastrophic_cascade"],
  ])("evaluates boundary grid %s safety %s risk %s", (grid,safety,risk,ending) => {
    const h=harness(); h.state.metrics.grid=grid; h.state.metrics.safety=safety; h.state.hiddenMetrics.cascadeRisk=risk;
    expect(evaluateEnding(h.state)).toBe(ending);
  });
  it("covers combinations at every ending threshold", () => {
    const h=harness();
    for(const grid of [0,34,35,54,55,69,70,100]) for(const safety of [0,39,40,59,60,74,75,100]) for(const risk of [0,30,31,69,70,99,100]) {
      h.state.metrics.grid=grid; h.state.metrics.safety=safety; h.state.hiddenMetrics.cascadeRisk=risk;
      expect(evaluateEnding(h.state)).toBeTruthy();
    }
  });
  it("calculates a manually checked weighted score", () => {
    const h=harness(); h.state.metrics={grid:80,safety:90,economy:70,trust:60}; h.state.collaborationScore=100;
    expect(calculateTeamScore(h.state)).toBe(8300); expect(calculateGrade(8300)).toBe("A");
  });
  it.each([[10000,"S"],[9000,"S"],[8999,"A"],[8000,"A"],[7999,"B"],[7000,"B"],[6999,"C"],[6000,"C"],[5999,"D"],[4000,"D"],[3999,"F"],[0,"F"]])("grades %s", (score,grade) => expect(calculateGrade(score)).toBe(grade));
});
