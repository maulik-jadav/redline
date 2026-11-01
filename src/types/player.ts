import type { PlayerId, RoomId } from "./common";

export const PLAYER_ROLES = [
  "engineer",
  "mayor",
  "executive",
  "journalist",
] as const;

export type PlayerRole = (typeof PLAYER_ROLES)[number];

export const ROLE_CHARACTER_IDS = {
  engineer: "maya_chen",
  mayor: "elena_torres",
  executive: "marcus_vale",
  journalist: "lena_okafor",
} as const satisfies Record<PlayerRole, string>;

export type CharacterId = (typeof ROLE_CHARACTER_IDS)[PlayerRole];

export const ROLE_CHARACTER_NAMES = {
  engineer: "Dr. Maya Chen",
  mayor: "Elena Torres",
  executive: "Marcus Vale",
  journalist: "Lena Okafor",
} as const satisfies Record<PlayerRole, string>;

export type CharacterName = (typeof ROLE_CHARACTER_NAMES)[PlayerRole];

export type PlayerConnectionStatus = "online" | "disconnected";
export type PlayerActivity = "idle" | "typing" | "voting";

export interface Player {
  readonly id: PlayerId;
  readonly roomId: RoomId;
  displayName: string;
  /** Null until a canonical role has been assigned. */
  role: PlayerRole | null;
  isHost: boolean;
  isReady: boolean;
  connectionStatus: PlayerConnectionStatus;
  activity: PlayerActivity;
}
