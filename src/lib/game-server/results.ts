import "server-only";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { EngineState } from "@/lib/game";
import type { CrisisMember } from "@/lib/supabase/database.types";
import type { ResultsView } from "@/types/results-view";
import { commandFailure } from "./errors";
import { privateBriefingPayload } from "@/lib/briefing/service";
import { opaqueRef } from "./snapshots";
export function resultsPayload(state:EngineState,members:CrisisMember[],selfId:string,code:string):ResultsView {
  if(state.status!=="completed"||state.phase!=="results"||!state.result)commandFailure("ACCESS_DENIED");
  const self=members.find(player=>player.id===selfId);if(!self?.role)commandFailure("ACCESS_DENIED");
  const result=state.result;const own=result.personalObjectives.find(value=>value.playerId===selfId);if(!own)commandFailure("ACCESS_DENIED");
  const briefing=privateBriefingPayload({self:{role:self.role,displayName:self.display_name,uses:0},status:{code,status:"active",phase:"mission_intro",selfPlayerId:selfId,acknowledgedCount:4,allAcknowledged:true,operators:[]}});
  const name=(id:string|undefined)=>members.find(player=>player.id===id)?.display_name??"SYSTEM";
  return {code,ending:result.ending,endingName:BLACKOUT_SCENARIO.endings[result.ending].name,narrative:BLACKOUT_SCENARIO.endings[result.ending].narrative,teamScore:result.teamScore,grade:result.grade,metrics:{...result.finalMetrics},postCrisisRisk:result.finalCascadeRisk,collaboration:result.collaborationScore,
    ownObjective:{name:own.objectiveName,conditions:briefing.objective.conditions,completed:own.completed,...(own.bonusCompleted!==undefined?{bonus:own.bonusCompleted}:{})},
    awards:result.awards.slice(0,4).map(award=>({name:award.awardId.replaceAll("_"," ").toUpperCase(),player:name(award.playerId),...(award.reason?{reason:award.reason}:{})})),truthExposed:result.specialAchievements.includes("truth_exposed"),
    files:members.map(member=>({character:BLACKOUT_SCENARIO.roles[member.role!].characterName,role:BLACKOUT_SCENARIO.roles[member.role!].title,callsign:member.display_name,secret:BLACKOUT_SCENARIO.roles[member.role!].secret,directive:{name:result.personalObjectives.find(value=>value.playerId===member.id)!.objectiveName,completed:result.personalObjectives.find(value=>value.playerId===member.id)!.completed}})),
    truth:{causes:[...BLACKOUT_SCENARIO.truth.causes],cascade:[...BLACKOUT_SCENARIO.truth.cascade],history:[...BLACKOUT_SCENARIO.truth.history],conclusion:BLACKOUT_SCENARIO.truth.conclusion},
    timeline:state.timeline.map(entry=>({key:opaqueRef(entry.id),seconds:Math.max(0,Math.floor((Date.parse(entry.occurredAt)-Date.parse(state.startedAt??entry.occurredAt))/1000)),message:entry.message,actor:name(entry.playerId)})),
  };
}
