/** Public engine surface. Draft-mutating helpers deliberately remain internal. */
export { createGame } from "./create-game";
export { startGame, advancePhase } from "./phases";
export { startRound } from "./rounds";
export { clampMetric, applyMetricEffects, roundHalfAwayFromZero } from "./metrics";
export { createProposal, createCanonicalProposal, selectProposal, selectDefaultResponse,
  submitNormalVote, finalizeNormalVote, selectCanonicalResponse } from "./voting";
export { shareEvidence, shareIntelligence } from "./evidence";
export { executeAbility } from "./abilities";
export { enterRedlineProtocol, submitRedlineSelection, finalizeRedlineDeadlock } from "./redline";
export { evaluateEnding } from "./endings";
export { calculateTeamScore, calculateGrade, buildGameResult } from "./scoring";
export { evaluatePersonalObjectives } from "./objectives";
export type { EngineError, EngineErrorCode, EngineResult } from "./errors";
export type { EngineState, CommandContext, Actor, RuntimeProposal, PrivateIntelligence, EngineTimelineEntry } from "./runtime";
export type { AbilityInput } from "./abilities";
