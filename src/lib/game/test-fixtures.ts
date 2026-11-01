import { expect } from "vitest";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { CanonicalResponseId } from "@/data/blackout";
import type { EvidenceKey, PlayerId } from "@/types";
import { advancePhase, createCanonicalProposal, createGame, finalizeNormalVote,
  selectProposal, startGame, submitNormalVote } from "./index";
import type { CommandContext, EngineResult, EngineState } from "./index";

export const assignments = { engineer: "maya", mayor: "elena", executive: "marcus", journalist: "lena" };
export const players = Object.values(assignments);

export function accepted(result: EngineResult): EngineState {
  expect(result.ok, result.ok ? undefined : JSON.stringify(result.error)).toBe(true);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

export function harness() {
  let sequence = 0;
  return {
    state: createGame({ roomId: "room", mode: "standard", roleAssignments: assignments }),
    context(): CommandContext { return { commandId: `command-${++sequence}`, occurredAt: "2042-03-01T00:00:00.000Z" }; },
    apply(result: EngineResult) { this.state = accepted(result); return this.state; },
  };
}
export type Harness = ReturnType<typeof harness>;

export function boot(h: Harness): void {
  h.apply(startGame(h.state, h.context()));
  h.apply(advancePhase(h.state, h.context()));
  h.apply(advancePhase(h.state, h.context()));
  h.apply(advancePhase(h.state, h.context()));
}

export function select(h: Harness, responseId: CanonicalResponseId, evidenceKeys: EvidenceKey[] = [], publisher = "elena"): string {
  const context = h.context(); const proposalId = `proposal-${context.commandId}`;
  h.apply(createCanonicalProposal(h.state, { proposalId, responseId, playerId: publisher, evidenceKeys }, context));
  h.apply(selectProposal(h.state, { proposalId, actor: { playerId: publisher, isHost: true } }, h.context()));
  return proposalId;
}

export function choose(h: Harness, responseId: CanonicalResponseId, evidenceKeys: EvidenceKey[] = [], publisher = "elena", approvals: PlayerId[] = players): void {
  const proposalId = select(h, responseId, evidenceKeys, publisher);
  for (const playerId of players) h.apply(submitNormalVote(h.state, {
    proposalId, playerId, choice: approvals.includes(playerId) ? "approve" : "reject",
  }, h.context()));
  h.apply(finalizeNormalVote(h.state, { reason: "all_votes" }, h.context()));
}

export function nextRound(h: Harness): void {
  h.apply(advancePhase(h.state, h.context()));
  h.apply(advancePhase(h.state, h.context()));
}

export function atRound(round: 1 | 2 | 3 | 4 | 5): Harness {
  const h = harness(); boot(h);
  while (h.state.round !== round) {
    const current = h.state.round;
    if (!current || current === 5) throw new Error("Invalid fixture round.");
    choose(h, BLACKOUT_SCENARIO.rounds[current].defaultResponse);
    nextRound(h);
  }
  return h;
}
