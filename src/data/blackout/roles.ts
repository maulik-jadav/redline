import { ROLE_CHARACTER_IDS, ROLE_CHARACTER_NAMES } from "@/types";
import type { PlayerRole } from "@/types";
import { BLACKOUT_ABILITIES } from "./abilities";
import type { RoleDefinition } from "./config";

export const BLACKOUT_ROLES = {
  engineer: {
    role: "engineer", characterId: ROLE_CHARACTER_IDS.engineer,
    characterName: ROLE_CHARACTER_NAMES.engineer,
    title: "Chief Grid Systems Engineer",
    publicResponsibility: "Responsible for ORACLE and Novus City's electrical infrastructure.",
    secret: "Six hours before the crisis, Maya authorized deployment of ORACLE Optimization Build 7.4 despite incomplete load testing.",
    primaryObjective: { name: "KEEP THE GRID ALIVE", conditions: [
      { kind: "metric", metric: "grid", operator: "gte", value: 55 },
    ] },
    bonusObjective: { kind: "narrative_only", description: "Avoid becoming solely blamed for the crisis." },
    ability: BLACKOUT_ABILITIES.diagnostic_scan,
  },
  mayor: {
    role: "mayor", characterId: ROLE_CHARACTER_IDS.mayor,
    characterName: ROLE_CHARACTER_NAMES.mayor,
    title: "Mayor of Novus City",
    publicResponsibility: "Responsible for protecting 3.2 million residents and coordinating emergency response.",
    secret: "Tomorrow is election day. Internal polling indicates that a major emergency-response failure will probably end Elena's political career.",
    primaryObjective: { name: "PROTECT THE CITY", conditions: [
      { kind: "metric", metric: "safety", operator: "gte", value: 70 },
      { kind: "metric", metric: "trust", operator: "gte", value: 50 },
    ] },
    ability: BLACKOUT_ABILITIES.emergency_order,
  },
  executive: {
    role: "executive", characterId: ROLE_CHARACTER_IDS.executive,
    characterName: ROLE_CHARACTER_NAMES.executive,
    title: "Chief Operations Officer — Helix Energy",
    publicResponsibility: "Represents the company responsible for Novus City's electrical infrastructure.",
    secret: "Three months before the crisis, Marcus received a report recommending immediate replacement of Transformer Cluster S7. Marcus approved delaying the replacement until the next fiscal quarter.",
    primaryObjective: { name: "PROTECT HELIX", conditions: [
      { kind: "metric", metric: "economy", operator: "gte", value: 55 },
      { kind: "flag", flag: "helixExposed", value: false },
    ] },
    ability: BLACKOUT_ABILITIES.corporate_intel,
  },
  journalist: {
    role: "journalist", characterId: ROLE_CHARACTER_IDS.journalist,
    characterName: ROLE_CHARACTER_NAMES.journalist,
    title: "Investigative Journalist — Novus News Network",
    publicResponsibility: "Reports on the crisis from inside the emergency command center.",
    secret: "Before the crisis, an anonymous Helix engineer contacted Lena. The source claimed Helix had ignored dangerous infrastructure warnings. Lena does not initially possess enough confirmed evidence to responsibly publish the allegation.",
    primaryObjective: { name: "UNCOVER THE TRUTH", conditions: [
      { kind: "flag", flag: "trueCauseDiscovered", value: true },
    ] },
    bonusObjective: {
      kind: "publication", description: "Publish confirmed evidence of wrongdoing.",
      evidence: "march_inspection_report", verification: "confirmed", visibility: "public",
      attributedToRole: "journalist",
      actions: ["breaking_leak", "r4_publicly_disclose_known_evidence"],
    },
    ability: BLACKOUT_ABILITIES.breaking_leak,
  },
} as const satisfies { [Role in PlayerRole]: RoleDefinition & { readonly role: Role } };
