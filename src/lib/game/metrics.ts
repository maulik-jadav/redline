import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { HiddenMetrics, MetricEffects, PublicMetrics } from "@/types";
import { reject } from "./errors";
import type { EngineState } from "./runtime";

export function clampMetric(value: number): number {
  if (!Number.isFinite(value)) reject("INVALID_INPUT", "Metrics must be finite.");
  const { min, max } = BLACKOUT_SCENARIO.rules.metricBounds;
  return Math.max(min, Math.min(max, value));
}

export function roundHalfAwayFromZero(value: number): number {
  if (!Number.isFinite(value)) reject("INVALID_INPUT", "Delta must be finite.");
  return Math.sign(value) * Math.round(Math.abs(value)) || 0;
}

export function applyMetricEffects(metrics: PublicMetrics, hiddenMetrics: HiddenMetrics, effects: MetricEffects) {
  return {
    metrics: {
      grid: clampMetric(metrics.grid + (effects.grid ?? 0)),
      safety: clampMetric(metrics.safety + (effects.safety ?? 0)),
      economy: clampMetric(metrics.economy + (effects.economy ?? 0)),
      trust: clampMetric(metrics.trust + (effects.trust ?? 0)),
    },
    hiddenMetrics: { cascadeRisk: clampMetric(hiddenMetrics.cascadeRisk + (effects.cascadeRisk ?? 0)) },
  };
}

export function applyEffectsDraft(state: EngineState, effects: MetricEffects): void {
  Object.assign(state, applyMetricEffects(state.metrics, state.hiddenMetrics, effects));
}
