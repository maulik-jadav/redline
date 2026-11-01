import type { EvidenceKey } from "@/types";
import type { EvidenceDefinition } from "./config";

export const BLACKOUT_EVIDENCE = {
  oracle_build_7_4_deployment: {
    key: "oracle_build_7_4_deployment", title: "ORACLE DEPLOYMENT LOG",
    content: "BUILD:\n7.4\n\nDEPLOYED:\n06 HOURS BEFORE INCIDENT\n\nLOAD TEST:\nINCOMPLETE\n\nAUTHORIZED BY:\nDR. MAYA CHEN",
    ownerRole: "engineer", visibility: "private", verification: "confirmed",
    earliestDiscoveryRound: 4, discovery: { kind: "automatic", round: 4 },
    significance: "Establishes the update's timing, incomplete load test, and Maya's authorization.",
  },
  march_inspection_report: {
    key: "march_inspection_report", title: "MARCH INSPECTION REPORT",
    content: "TRANSFORMER CLUSTER S7\n\nSTATUS:\nCRITICAL DEGRADATION\n\nRECOMMENDATION:\nIMMEDIATE REPLACEMENT\n\nFAILURE RISK:\nSEVERE",
    ownerRole: "executive", visibility: "private", verification: "confirmed",
    earliestDiscoveryRound: 3,
    discovery: { kind: "ability_use", abilityId: "corporate_intel", earliestRound: 3 },
    significance: "Confirmed evidence of Helix's prior knowledge of the dangerous S7 condition.",
  },
  anonymous_s7_warning: {
    key: "anonymous_s7_warning", title: "ANONYMOUS S7 WARNING",
    content: "Your anonymous source previously mentioned \"S7\" during your conversations.",
    ownerRole: "journalist", visibility: "private", verification: "unverified",
    earliestDiscoveryRound: 1, discovery: { kind: "early_intelligence" },
    significance: "An unverified lead connecting Lena's source to S7, insufficient for responsible publication.",
  },
  anonymous_partial_march_report: {
    key: "anonymous_partial_march_report", title: "ANONYMOUS PARTIAL MARCH REPORT",
    content: "Reports are emerging that infrastructure warnings may have existed before today's crisis.",
    ownerRole: "journalist", visibility: "private", verification: "unverified",
    earliestDiscoveryRound: 4,
    discovery: {
      kind: "conditional_automatic", round: 4,
      unlessEvidence: { key: "march_inspection_report", verification: "confirmed", visibility: ["shared", "public"] },
    },
    significance: "Partial evidence from Lena's anonymous source; not a substitute for the confirmed March report.",
  },
  hospital_impact_report: {
    key: "hospital_impact_report", title: "HOSPITAL IMPACT REPORT",
    content: "St. Anne's ICU currently supports 37 critical patients.",
    ownerRole: "mayor", visibility: "private", verification: "confirmed",
    earliestDiscoveryRound: 2, discovery: { kind: "automatic", round: 2 },
    significance: "Establishes the hospital's immediate civilian stakes.",
  },
  transformer_degradation_analysis: {
    key: "transformer_degradation_analysis", title: "TRANSFORMER ANALYSIS",
    content: "Physical degradation predates today's ORACLE update by several months.",
    ownerRole: "engineer", visibility: "private", verification: "confirmed",
    earliestDiscoveryRound: 3,
    discovery: { kind: "ability_use", abilityId: "diagnostic_scan", earliestRound: 3, target: "sector_7" },
    significance: "Confirms that S7 degradation predates the ORACLE update.",
  },
  failure_correlation_analysis: {
    key: "failure_correlation_analysis", title: "FAILURE CORRELATION ANALYSIS",
    content: "ORACLE BUILD 7.4\n        +\nPRE-EXISTING S7 DEGRADATION\n        ↓\nLOAD REDISTRIBUTION\n        ↓\nTHERMAL OVERLOAD\n        ↓\nTRANSFORMER FAILURE",
    visibility: "shared", verification: "confirmed", earliestDiscoveryRound: 4,
    discovery: {
      kind: "correlation", maximumUnlocks: 1, flags: { trueCauseDiscovered: true },
      paths: [
        { kind: "all_evidence", evidence: [
          { key: "transformer_degradation_analysis", verification: "confirmed", visibility: ["shared", "public"] },
          { key: "oracle_build_7_4_deployment", verification: "confirmed", visibility: ["shared", "public"] },
        ] },
        { kind: "approved_response_and_any_evidence", round: 4, responseId: "r4_independent_investigation", evidence: [
          { key: "transformer_degradation_analysis", verification: "confirmed", visibility: ["shared", "public"] },
          { key: "oracle_build_7_4_deployment", verification: "confirmed", visibility: ["shared", "public"] },
          { key: "march_inspection_report", verification: "confirmed", visibility: ["shared", "public"] },
        ] },
      ],
    },
    significance: "Neither the AI update nor infrastructure neglect alone caused the disaster. Their interaction did.",
  },
} as const satisfies { [Key in EvidenceKey]: EvidenceDefinition & { readonly key: Key } };
