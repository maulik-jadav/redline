import type { PublicMetrics } from "./metrics";
export interface ResultsView {
  code:string;ending:string;endingName:string;narrative:string;teamScore:number;grade:string;metrics:PublicMetrics;postCrisisRisk:number;collaboration:number;
  ownObjective:{name:string;conditions:string[];completed:boolean;bonus?:boolean};
  awards:{name:string;player:string;reason?:string}[];truthExposed:boolean;
  files:{character:string;role:string;callsign:string;secret:string;directive:{name:string;completed:boolean}}[];
  truth:{causes:string[];cascade:string[];history:string[];conclusion:string};
  timeline:{key:string;seconds:number;message:string;actor:string}[];
}
