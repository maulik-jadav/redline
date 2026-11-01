import { ABILITY_LIMITS, ABILITY_OWNER_ROLES } from "@/types";
import type { RoleAbilityId } from "@/types";
import type { AbilityDefinition } from "./config";

export const BLACKOUT_ABILITIES = {
  diagnostic_scan: {
    id: "diagnostic_scan", name: "DIAGNOSTIC SCAN",
    ownerRole: ABILITY_OWNER_ROLES.diagnostic_scan,
    maxUses: ABILITY_LIMITS.diagnostic_scan,
    description: "Investigates grid sectors, transformers, and ORACLE subsystems, producing high-confidence technical intelligence.",
  },
  emergency_order: {
    id: "emergency_order", name: "EMERGENCY ORDER",
    ownerRole: ABILITY_OWNER_ROLES.emergency_order,
    maxUses: ABILITY_LIMITS.emergency_order,
    description: "Immediately selects an eligible active proposal and begins voting.",
  },
  corporate_intel: {
    id: "corporate_intel", name: "CORPORATE INTEL",
    ownerRole: ABILITY_OWNER_ROLES.corporate_intel,
    maxUses: ABILITY_LIMITS.corporate_intel,
    description: "Accesses confidential Helix records. Discovered information remains private until voluntarily shared.",
  },
  breaking_leak: {
    id: "breaking_leak", name: "BREAKING LEAK",
    ownerRole: ABILITY_OWNER_ROLES.breaking_leak,
    maxUses: ABILITY_LIMITS.breaking_leak,
    description: "Publishes selected evidence to the public. Confirmed wrongdoing may expose Helix; unverified publication may damage Public Trust.",
  },
} as const satisfies { [Id in RoleAbilityId]: AbilityDefinition & { readonly id: Id } };
