import type { GameMode, GamePhase } from "./game";
import type { PlayerRole } from "./player";
import type { GridMapState } from "./map";
import type { PublicMetrics } from "./metrics";
export type RoundOneResponse=import("@/data/blackout").CanonicalResponseId;
export interface CrisisEvidence {ref:string;title:string;text:string;verification:string;visibility:string}
export interface CrisisIntel {ref:string;text:string;confidence:string;visibility:string;owner:string;formal:boolean}
export interface CrisisProposal {ref:string;title:string;action:string;reason:string;source:string;creator:string;status:string}
export interface CrisisSnapshot {
  code:string;scenario:"BLACKOUT";mode:GameMode;phase:GamePhase;round:1|2|3|4|5|null;roundName:string;resultsReady:boolean;version:number;serverNow:string;phaseEndsAt:string|null;roundComplete:boolean;
  metrics:PublicMetrics;map:GridMapState;
  self:{playerId:string;role:PlayerRole;callsign:string;isHost:boolean;mayorUses:number;ability:{name:string;description:string;uses:number}};
  operators:{presenceId:string;name:string;role:PlayerRole;isHost:boolean;vote:"approve"|"reject"|null}[];
  ownIntel:CrisisIntel[];sharedIntel:CrisisIntel[];ownEvidence:CrisisEvidence[];sharedEvidence:CrisisEvidence[];redline:{options:{id:import("./voting").RedlineChoice;name:string;description:string}[];selections:{name:string;choice:import("./voting").RedlineChoice|null}[]};broadcasts:{channel:string;line:string}[];finalResponse:{headline:string;description:string}|null;
  proposals:CrisisProposal[];selected:CrisisProposal|null;
  responses:{id:RoundOneResponse;title:string;description:string}[];
  activeEvent:{headline:string;description:string}|null;
  events:{kind:string;severity:string;key:string;headline:string;description:string}[];
  timeline:{key:string;message:string;actor:string|null;occurredAt:string}[];
  consequence:{authorized:boolean;custom:boolean;title:string;description:string;deltas:PublicMetrics}|null;
}
