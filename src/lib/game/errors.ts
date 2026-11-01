import type { EngineState } from "./runtime";

export type EngineErrorCode =
  | "INVALID_PHASE" | "INVALID_ROUND" | "INVALID_PLAYER" | "INVALID_ROLE"
  | "INVALID_PROPOSAL" | "INVALID_VOTE" | "ALREADY_VOTED"
  | "ABILITY_UNAVAILABLE" | "ABILITY_EXHAUSTED" | "INVALID_TARGET"
  | "EVIDENCE_UNAVAILABLE" | "EVIDENCE_ALREADY_SHARED" | "INVALID_INPUT"
  | "INVALID_REDLINE_SELECTION" | "GAME_ALREADY_COMPLETED" | "VERSION_CONFLICT"
  | "COMMAND_ALREADY_APPLIED";

export interface EngineError { code: EngineErrorCode; message: string }
export type EngineResult = { ok: true; state: EngineState } | { ok: false; error: EngineError };

export function reject(code: EngineErrorCode, message: string): never {
  throw { code, message } satisfies EngineError;
}

export function isEngineError(value: unknown): value is EngineError {
  return typeof value === "object" && value !== null && "code" in value && "message" in value;
}
