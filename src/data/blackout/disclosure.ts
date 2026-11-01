import type { DisclosurePolicy, SuppressionExposureRule } from "./config";

/** Section 87.15 supersedes the earlier flat Round 4 disclosure effect. */
export const BLACKOUT_DISCLOSURE = {
  eligibility: "known_to_room_or_legitimately_possessed_by_publisher",
  visibility: "public",
  consequenceSelection: "highest_priority_once_per_disclosure",
  categories: {
    confirmed_helix_wrongdoing: {
      priority: 1, verification: "confirmed", qualifyingEvidence: ["march_inspection_report"],
      effects: { trust: 7, economy: -5 },
      flags: { helixExposed: true, confirmedWrongdoingPublished: true },
    },
    confirmed_non_helix: {
      priority: 2, verification: "confirmed", effects: { trust: 4, economy: -3 },
    },
    unverified: {
      priority: 3, verification: "unverified", effects: { trust: -8, economy: -3 },
    },
  },
} as const satisfies DisclosurePolicy;

export const BLACKOUT_SUPPRESSION_EXPOSURE = {
  trigger: "later_publication_of_confirmed_evidence_available_to_room_at_suppression",
  effects: { trust: -12 }, flags: { suppressionExposed: true }, maximumApplications: 1,
} as const satisfies SuppressionExposureRule;

export const BLACKOUT_PUBLICATION_RULES = {
  roomSharing: { exposesHelix: false, changesVerification: false, reversible: false },
  publicDisclosure: { reversible: false },
  helixExposure: {
    evidence: "march_inspection_report", verification: "confirmed", visibility: "public",
    flags: BLACKOUT_DISCLOSURE.categories.confirmed_helix_wrongdoing.flags,
  },
  // Breaking Leak's specified cases, without inventing a non-Helix leak effect.
  breakingLeak: {
    confirmedHelixWrongdoing: BLACKOUT_DISCLOSURE.categories.confirmed_helix_wrongdoing,
    unverified: BLACKOUT_DISCLOSURE.categories.unverified,
  },
} as const;
