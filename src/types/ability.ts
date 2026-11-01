import type { PlayerRole } from "./player";

export type RoleAbilityId =
  | "diagnostic_scan"
  | "emergency_order"
  | "corporate_intel"
  | "breaking_leak";

export const ABILITY_LIMITS = {
  diagnostic_scan: 3,
  emergency_order: 1,
  corporate_intel: 2,
  breaking_leak: 1,
} as const satisfies Record<RoleAbilityId, number>;

export const ABILITY_OWNER_ROLES = {
  diagnostic_scan: "engineer",
  emergency_order: "mayor",
  corporate_intel: "executive",
  breaking_leak: "journalist",
} as const satisfies Record<RoleAbilityId, PlayerRole>;

export interface RoleAbility {
  readonly id: RoleAbilityId;
  readonly ownerRole: PlayerRole;
  readonly maxUses: number;
  /** Future engine validation enforces 0 <= remainingUses <= maxUses. */
  remainingUses: number;
}
