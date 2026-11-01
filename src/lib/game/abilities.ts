import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { EvidenceDefinition } from "@/data/blackout";
import type { EvidenceKey, PlayerId, RoleAbilityId } from "@/types";
import { rewardDraft } from "./collaboration";
import { discoverDraft, publishDraft } from "./evidence";
import { reject } from "./errors";
import { requireInteraction, requirePlayer } from "./guards";
import type { CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";
import { command } from "./transaction";
import { selectDraft } from "./voting";

export type AbilityInput = { playerId: PlayerId } & (
  | { abilityId: "diagnostic_scan"; target: string }
  | { abilityId: "corporate_intel" }
  | { abilityId: "emergency_order"; proposalId: string }
  | { abilityId: "breaking_leak"; evidenceKeys: EvidenceKey[] }
);

export function executeAbility(state: EngineState, input: AbilityInput, context: CommandContext) {
  return command(state, context, draft => {
    requireInteraction(draft);
    const role = requirePlayer(draft, input.playerId);
    if (!Object.hasOwn(draft.abilities, input.abilityId)) reject("ABILITY_UNAVAILABLE", "Unknown ability.");
    const ability = draft.abilities[input.abilityId];
    if (ability.ownerRole !== role) reject("INVALID_ROLE", "Ability belongs to another role.");
    if (ability.remainingUses <= 0) reject("ABILITY_EXHAUSTED", "No ability uses remain.");
    let useful = true;
    if (input.abilityId === "emergency_order") selectDraft(draft, input.proposalId, { playerId: input.playerId }, context, true);
    else if (input.abilityId === "breaking_leak") publishDraft(draft, input.playerId, input.evidenceKeys, [input.playerId], context);
    else {
      const target = input.abilityId === "diagnostic_scan" ? input.target : undefined;
      const definition = (Object.values(BLACKOUT_SCENARIO.evidence) as EvidenceDefinition[]).find(definition => {
        const discovery = definition.discovery;
        return discovery.kind === "ability_use" && discovery.abilityId === input.abilityId && discovery.target === target;
      });
      if (!definition) reject("INVALID_TARGET", "No canonical result exists for this target.");
      const discovery = definition.discovery;
      if (discovery.kind !== "ability_use" || !draft.round || draft.round < discovery.earliestRound) reject("ABILITY_UNAVAILABLE", "Evidence is not available this round.");
      useful = discoverDraft(draft, definition.key, context);
    }
    ability.remainingUses -= 1;
    if (useful) rewardDraft(draft, "usefulRoleAbility", JSON.stringify([input.abilityId, ability.maxUses - ability.remainingUses]), input.playerId);
    record(draft, context, "ability_used", BLACKOUT_SCENARIO.abilities[input.abilityId as RoleAbilityId].name,
      input.playerId, { abilityId: input.abilityId });
  });
}
