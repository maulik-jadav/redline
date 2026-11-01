import { BLACKOUT_DISCLOSURE } from "./disclosure";
import { BLACKOUT_ENDINGS } from "./endings";
import { BLACKOUT_REDLINE } from "./redline";
import { BLACKOUT_ROUNDS } from "./rounds";

/** Baseline content references only. No AI calls, fallback execution, or interpolation. */
export const BLACKOUT_FALLBACK_CONTENT = {
  roundEvents: {
    1: BLACKOUT_ROUNDS[1].publicEvent,
    2: BLACKOUT_ROUNDS[2].publicEvent,
    3: BLACKOUT_ROUNDS[3].publicEvent,
    4: BLACKOUT_ROUNDS[4].publicEvent,
    5: BLACKOUT_ROUNDS[5].publicEvent,
  },
  hospitalVariants: BLACKOUT_ROUNDS[2].severity.variants,
  npcMessages: BLACKOUT_ROUNDS[5].npcMessages,
  redlineActivation: BLACKOUT_REDLINE.activation,
  redlineDeadlock: BLACKOUT_REDLINE.deadlock,
  system: {
    decisionRequired: "DECISION REQUIRED",
    decisionApproved: "DECISION AUTHORIZED",
    decisionRejected: "DECISION REJECTED",
    criticalEvent: "CRITICAL EVENT",
    crisisTerminated: "CRISIS TERMINATED",
    customCommandOffline: "CUSTOM COMMAND ANALYSIS OFFLINE\n\nCanonical response protocols remain available.",
  },
  disclosures: {
    confirmedHelix: {
      headline: "BREAKING",
      description: "BREAKING — Helix Energy knew critical infrastructure was at risk months before today's emergency.",
      consequence: BLACKOUT_DISCLOSURE.categories.confirmed_helix_wrongdoing,
    },
    unverified: {
      headline: "HELIX RESPONSE",
      description: "Helix denies an unverified report alleging prior knowledge of infrastructure problems.",
      consequence: BLACKOUT_DISCLOSURE.categories.unverified,
    },
  },
  endings: BLACKOUT_ENDINGS,
} as const;
