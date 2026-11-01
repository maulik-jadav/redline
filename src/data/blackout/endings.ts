import type { EndingId } from "@/types";
import type { EndingDefinition } from "./config";

/** Priority is authoritative; conditions are data, not executable predicates. */
export const BLACKOUT_ENDINGS = {
  catastrophic_cascade: {
    id: "catastrophic_cascade", name: "CATASTROPHIC CASCADE", priority: 1,
    narrative: "Cascading transformer failures overwhelm the Novus electrical grid.",
    conditions: [{ kind: "metric", metric: "cascadeRisk", operator: "gte", value: 100 }],
  },
  grid_collapse: {
    id: "grid_collapse", name: "GRID COLLAPSE", priority: 2,
    narrative: "Novus City's electrical network collapses.",
    conditions: [{ kind: "metric", metric: "grid", operator: "lt", value: 35 }],
  },
  humanitarian_disaster: {
    id: "humanitarian_disaster", name: "HUMANITARIAN DISASTER", priority: 3,
    narrative: "The electrical grid survives, but emergency systems fail to protect thousands of Novus residents.",
    conditions: [
      { kind: "metric", metric: "grid", operator: "gte", value: 35 },
      { kind: "metric", metric: "safety", operator: "lt", value: 40 },
    ],
  },
  miracle_recovery: {
    id: "miracle_recovery", name: "MIRACLE RECOVERY", priority: 4,
    narrative: "Novus City stabilizes with limited loss of life.",
    conditions: [
      { kind: "metric", metric: "grid", operator: "gte", value: 70 },
      { kind: "metric", metric: "safety", operator: "gte", value: 75 },
      { kind: "metric", metric: "cascadeRisk", operator: "lte", value: 30 },
    ],
  },
  city_saved: {
    id: "city_saved", name: "CITY SAVED", priority: 5,
    narrative: "The grid survives. Recovery will take weeks.",
    conditions: [
      { kind: "metric", metric: "grid", operator: "gte", value: 55 },
      { kind: "metric", metric: "safety", operator: "gte", value: 60 },
      { kind: "metric", metric: "cascadeRisk", operator: "lt", value: 70 },
    ],
  },
  pyrrhic_victory: {
    id: "pyrrhic_victory", name: "PYRRHIC VICTORY", priority: 6,
    narrative: "Novus survives, but at enormous economic and human cost.",
    conditions: [
      { kind: "metric", metric: "grid", operator: "gte", value: 35 },
      { kind: "metric", metric: "safety", operator: "gte", value: 40 },
    ],
  },
} as const satisfies { [Id in EndingId]: EndingDefinition & { readonly id: Id } };
