import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { GameResult, GameState, TeamGrade } from "@/types";
import { matchesConditions } from "./conditions";
import { evaluateEnding } from "./endings";
import { reject } from "./errors";
import { evaluatePersonalObjectives } from "./objectives";
import type { EngineState } from "./runtime";

export function calculateTeamScore(state: GameState): number {
  const { weights, scoreScale, scoreBounds } = BLACKOUT_SCENARIO.scoring;
  const weighted = state.metrics.grid * weights.grid + state.metrics.safety * weights.safety +
    state.metrics.economy * weights.economy + state.metrics.trust * weights.trust + state.collaborationScore * weights.collaboration;
  return Math.max(scoreBounds.min, Math.min(scoreBounds.max, Math.round(weighted * scoreScale)));
}

export function calculateGrade(score: number): TeamGrade {
  const grade = Object.values(BLACKOUT_SCENARIO.scoring.grades).find(grade => score >= grade.min && score <= grade.max);
  if (!grade) reject("INVALID_INPUT", "Score is outside configured grade bounds.");
  return grade.grade;
}

/** Pure result projection. Awards are deliberately unassigned pending precise counters. */
export function buildGameResult(state: EngineState): GameResult {
  if (!state.redlineResolution) reject("INVALID_PHASE", "Results require a resolved REDLINE ballot.");
  const teamScore = calculateTeamScore(state);
  return {
    ending: evaluateEnding(state), teamScore, grade: calculateGrade(teamScore),
    finalMetrics: { ...state.metrics }, finalCascadeRisk: state.hiddenMetrics.cascadeRisk,
    collaborationScore: state.collaborationScore, personalObjectives: evaluatePersonalObjectives(state), awards: [],
    specialAchievements: Object.values(BLACKOUT_SCENARIO.scoring.achievements)
      .filter(achievement => matchesConditions(state, achievement.conditions)).map(achievement => achievement.id),
  };
}
