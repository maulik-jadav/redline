import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { PlayerId } from "@/types";
import type { EngineState } from "./runtime";

type Reward = keyof typeof BLACKOUT_SCENARIO.scoring.collaboration.rewards;

/** Internal: caller supplies the configured scope identity (item, vote/player, use, etc.). */
export function rewardDraft(state: EngineState, reward: Reward, scope: string, playerId?: PlayerId): void {
  const key = JSON.stringify([reward, scope]);
  if (state.collaborationRewards.includes(key)) return;
  const { rewards, bounds } = BLACKOUT_SCENARIO.scoring.collaboration;
  const points = rewards[reward].points;
  state.collaborationRewards.push(key);
  state.collaborationScore = Math.max(bounds.min, Math.min(bounds.max, state.collaborationScore + points));
  if (playerId) state.contributions[playerId] = (state.contributions[playerId] ?? 0) + points;
}
