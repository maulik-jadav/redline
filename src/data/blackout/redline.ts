import type { RedlineChoice } from "@/types";
import type { RedlineOption } from "./config";

export const BLACKOUT_REDLINE_OPTIONS = {
  total_grid_shutdown: {
    id: "total_grid_shutdown", name: "TOTAL GRID SHUTDOWN", kind: "fixed",
    description: "Shut down the entire Novus grid and restart sectors manually.",
    effects: { grid: 20, safety: -8, economy: -18, trust: -5, cascadeRisk: -40 },
  },
  trust_oracle: {
    id: "trust_oracle", name: "TRUST ORACLE", kind: "flag_branches",
    description: "Allow ORACLE Build 7.4 to autonomously rebalance the grid.",
    flag: "s7Isolated",
    whenTrue: { grid: 18, safety: 8, economy: 5, trust: 4, cascadeRisk: -25 },
    whenFalse: { grid: -20, safety: -15, economy: -10, trust: -10, cascadeRisk: 30 },
  },
  manual_takeover: {
    id: "manual_takeover", name: "MANUAL TAKEOVER", kind: "fixed",
    description: "Engineers manually redistribute power while emergency services prioritize critical infrastructure.",
    effects: { grid: 8, safety: 14, economy: -8, trust: 6, cascadeRisk: -18 },
  },
} as const satisfies { [Id in RedlineChoice]: RedlineOption & { readonly id: Id } };

export const BLACKOUT_REDLINE = {
  options: BLACKOUT_REDLINE_OPTIONS,
  ballot: {
    kind: "single_choice", requiredVotes: 3, totalPlayers: 4,
    changesAllowedWhileOpen: true, countedSelection: "latest_per_player",
    authorization: "immediate_on_threshold", maximumResolutions: 1,
    disconnectedNonvoter: "no_selection",
  },
  activation: {
    headline: "UNCONTROLLED CASCADE IMMINENT",
    description: "STANDARD RESPONSE OPTIONS EXHAUSTED\n\nREDLINE PROTOCOL AVAILABLE",
  },
  deadlock: {
    headline: "REDLINE DEADLOCK",
    description: "No option obtained three votes before the deadline.",
    effects: { cascadeRisk: 25 }, endingCalculation: "after_deadlock_effects",
  },
} as const;
