export type PublicMetricKey = "grid" | "safety" | "economy" | "trust";

/** Each metric has a valid runtime range of 0–100, enforced by the future engine. */
export interface PublicMetrics {
  grid: number;
  safety: number;
  economy: number;
  trust: number;
}

/** Authoritative hidden data; do not send wholesale to unauthorized clients. */
export interface HiddenMetrics {
  /** Valid runtime range: 0–100. Normally hidden numerically from players. */
  cascadeRisk: number;
}

/** Deltas, not resulting values. An omitted metric has no specified change.
 * Custom-action recommendations require future server validation and clamps;
 * these numbers neither apply effects nor authorize AI to mutate state.
 */
export interface MetricEffects {
  grid?: number;
  safety?: number;
  economy?: number;
  trust?: number;
  cascadeRisk?: number;
}
