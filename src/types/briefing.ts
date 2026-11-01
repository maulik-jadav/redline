import type { PlayerRole } from "./player";
export interface BriefingStatus {
  code:string; status:"active"; phase:"briefing"|"mission_intro";
  selfPlayerId:string; acknowledgedCount:number; allAcknowledged:boolean;
  operators:{id:string;displayName:string;acknowledged:boolean}[];
}
export interface PrivateBriefing {
  callsign:string; role:PlayerRole; characterName:string; title:string; responsibility:string;
  secret:string; objective:{name:string;conditions:string[]}; bonus?:string;
  ability:{name:string;description:string;uses:number};
}
export interface BriefingContext {
  status:BriefingStatus;
  self:{role:PlayerRole;displayName:string;uses:number};
}
