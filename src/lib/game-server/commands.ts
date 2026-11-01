import "server-only";
import { z } from "zod";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import { advancePhase,createProposal,createCanonicalProposal,selectProposal,selectCanonicalResponse,selectDefaultResponse,executeAbility,shareIntelligence,shareEvidence,submitNormalVote,finalizeNormalVote,submitRedlineSelection,finalizeRedlineDeadlock } from "@/lib/game";
import type { EngineState,EngineResult,CommandContext } from "@/lib/game";
import type { PlayerCredential } from "@/lib/supabase/sessions";
import { hashSessionToken } from "@/lib/supabase/sessions";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import { toPersistenceSnapshot } from "@/lib/supabase/mapping";
import { gameContext } from "./context";
import { commandFailure } from "./errors";
import { opaqueRef } from "./snapshots";
import { analyzeCustom,readAnalysis,enhanceConsequence } from "@/lib/ai/game-master";
import type { MetricEffects } from "@/types";
import type { CanonicalResponseId } from "@/data/blackout";
const ref=z.string().regex(/^[a-f0-9]{32}$/);
const response=z.string().regex(/^r[1-4]_[a-z0-9_]+$/);
const evidenceRefs=z.array(ref).min(1).max(7);
const text=(max:number)=>z.string().trim().min(1).max(max).regex(/^[^\u0000-\u001f\u007f]*$/);
export const intentionSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("begin")}).strict(),z.object({type:z.literal("timeout")}).strict(),z.object({type:z.literal("next")}).strict(),
  z.object({type:z.literal("scan")}).strict(),z.object({type:z.literal("corporate")}).strict(),z.object({type:z.literal("publish"),evidenceRefs}).strict(),z.object({type:z.literal("redline"),choice:z.enum(["total_grid_shutdown","trust_oracle","manual_takeover"])}).strict(),
  z.object({type:z.literal("share"),ref}).strict(),z.object({type:z.literal("share_evidence"),ref}).strict(),
  z.object({type:z.literal("canonical"),responseId:response,evidenceRefs:evidenceRefs.optional()}).strict(),z.object({type:z.literal("select_response"),responseId:response,evidenceRefs:evidenceRefs.optional()}).strict(),
  z.object({type:z.literal("propose"),title:text(80),action:text(300),reason:text(300)}).strict(),
  z.object({type:z.literal("select"),ref}).strict(),z.object({type:z.literal("emergency"),ref}).strict(),
  z.object({type:z.literal("vote"),choice:z.enum(["approve","reject"])}).strict(),
]);
export const gameplayCommandSchema=z.object({commandId:z.uuid(),expectedVersion:z.number().int().min(0),intention:intentionSchema}).strict();
export type Intention=z.infer<typeof intentionSchema>;
export type GameplayCommand=z.infer<typeof gameplayCommandSchema>;

/** Produces accepted engine steps; only timing orchestration lives outside the engine. */
export function planCommand(state:EngineState,actor:{playerId:string;isHost:boolean},input:GameplayCommand,now:string,options:{fullGame?:boolean;customEffects?:MetricEffects}={}) {
  const root=input.intention.type==="begin"?`round-one:${state.roomId}`:`${actor.playerId}:${input.commandId}`;
  if(state.processedCommands.includes(root))return {root,states:[]};
  if(input.intention.type==="begin"&&state.round===1)return {root,states:[]};
  if(state.version!==input.expectedVersion)commandFailure("STATE_CHANGED");
  if(!options.fullGame&&state.round!==undefined&&state.round!==1)commandFailure("ROUND_ONE_COMPLETE");
  if(!options.fullGame&&state.phase==="consequence")commandFailure("ROUND_ONE_COMPLETE");
  const intent=input.intention;const states:EngineState[]=[];let current=state;
  const context=():CommandContext=>({commandId:states.length?`${root}:resolve`:root,occurredAt:now,expectedVersion:current.version});
  function accept(result:EngineResult){if(!result.ok)throw result.error;current=result.state;states.push(current);}
  const expired=!!state.phaseEndsAt&&Date.parse(now)>=Date.parse(state.phaseEndsAt);
  if(!["timeout","next"].includes(intent.type)&&expired)commandFailure("PHASE_EXPIRED");
  const selected=()=>{const value=Object.values(current.proposals).find(value=>"ref"in intent&&opaqueRef(value.proposal.id)===intent.ref);if(!value)commandFailure("INVALID_PROPOSAL");return value.proposal.id;};
  const keys=(refs:string[]|undefined)=>refs?.map(ref=>{const item=Object.values(current.evidence).find(value=>value&&opaqueRef(value.id)===ref);if(!item)commandFailure("EVIDENCE_UNAVAILABLE");return item.key;});
  if(intent.type==="begin") {if(state.phase!=="mission_intro")commandFailure("INVALID_PHASE");accept(advancePhase(current,context()));}
  else if(intent.type==="next") {
    if(!options.fullGame||current.phase!=="consequence"||!expired)commandFailure("INVALID_PHASE");accept(advancePhase(current,context()));
  }
  else if(intent.type==="timeout") {
    if(!expired)commandFailure("INVALID_PHASE");
    if(state.phase==="round_intro"||state.phase==="discussion")accept(advancePhase(current,context()));
    else if(state.phase==="response_selection")accept(selectDefaultResponse(current,{proposalId:`${root}:default`},context()));
    else if(state.phase==="voting")accept(finalizeNormalVote(current,{reason:"timeout",customEffects:options.customEffects},context()));
    else if(options.fullGame&&state.phase==="redline_protocol")accept(finalizeRedlineDeadlock(current,context()));
    else commandFailure("INVALID_PHASE");
  } else if(intent.type==="share") {const intel=current.privateIntel.find(value=>opaqueRef(value.id)===intent.ref);if(!intel)commandFailure("EVIDENCE_UNAVAILABLE");accept(shareIntelligence(current,{playerId:actor.playerId,intelId:intel.id},context()));}
  else if(intent.type==="share_evidence") {const evidence=Object.values(current.evidence).find(value=>value&&opaqueRef(value.id)===intent.ref);if(!evidence)commandFailure("EVIDENCE_UNAVAILABLE");accept(shareEvidence(current,{playerId:actor.playerId,evidenceKey:evidence.key},context()));}
  else if(intent.type==="canonical")accept(createCanonicalProposal(current,{proposalId:`${root}:proposal`,responseId:intent.responseId as CanonicalResponseId,playerId:actor.playerId,evidenceKeys:keys("evidenceRefs"in intent?intent.evidenceRefs:undefined)},context()));
  else if(intent.type==="select_response")accept(selectCanonicalResponse(current,{proposalId:`${root}:proposal`,responseId:intent.responseId as CanonicalResponseId,actor,evidenceKeys:keys("evidenceRefs"in intent?intent.evidenceRefs:undefined)},context()));
  else if(intent.type==="propose")accept(createProposal(current,{proposalId:`${root}:proposal`,playerId:actor.playerId,title:intent.title,action:intent.action,reason:intent.reason},context()));
  else if(intent.type==="select")accept(selectProposal(current,{proposalId:selected(),actor},context()));
  else if(intent.type==="emergency")accept(executeAbility(current,{playerId:actor.playerId,abilityId:"emergency_order",proposalId:selected()},context()));
  else if(intent.type==="scan")accept(executeAbility(current,{playerId:actor.playerId,abilityId:"diagnostic_scan",target:"sector_7"},context()));
  else if(intent.type==="corporate")accept(executeAbility(current,{playerId:actor.playerId,abilityId:"corporate_intel"},context()));
  else if(intent.type==="publish")accept(executeAbility(current,{playerId:actor.playerId,abilityId:"breaking_leak",evidenceKeys:keys(intent.evidenceRefs)!},context()));
  else if(intent.type==="redline")accept(submitRedlineSelection(current,{playerId:actor.playerId,choice:intent.choice},context()));
  else if(intent.type==="vote") {
    if(!current.selectedProposalId)commandFailure("INVALID_PROPOSAL");
    accept(submitNormalVote(current,{proposalId:current.selectedProposalId,playerId:actor.playerId,choice:intent.choice},context()));
    const votes=current.votes[current.selectedProposalId!];
    const threshold=votes.filter(value=>value.choice==="approve").length>=BLACKOUT_SCENARIO.rules.normalVote.requiredApprovals;
    if(threshold||votes.length===BLACKOUT_SCENARIO.rules.normalVote.totalPlayers)accept(finalizeNormalVote(current,{reason:threshold?"approval_threshold":"all_votes",customEffects:options.customEffects},context()));
  }
  if(current.round!==state.round)current.roundStartMetrics={...current.metrics};
  if(current.phase!==state.phase) {
    const timing=BLACKOUT_SCENARIO.timings[current.mode];
    const seconds=current.phase==="round_intro"?2.4:current.phase==="discussion"?timing.discussionSeconds:current.phase==="response_selection"?timing.responseSelectionSeconds:current.phase==="voting"?timing.normalVoteSeconds:current.phase==="consequence"||current.phase==="results"?3:current.phase==="redline_protocol"?timing.redlineVoteSeconds:null;
    if(seconds!==null)current.phaseEndsAt=new Date(Date.parse(now)+seconds*1000).toISOString();
  }
  return {root,states};
}
export async function runGameplayCommand(db:ServerDatabaseClient,code:string,credential:PlayerCredential,input:GameplayCommand,now=new Date().toISOString()) {
  const {state,self}=await gameContext(db,code,credential,{fullGame:true});
  let customEffects:MetricEffects|undefined;
  if(["select","emergency"].includes(input.intention.type)&&"ref"in input.intention) {
    // Validate host/role/phase/version before any optional provider work.
    planCommand(state,{playerId:credential.playerId,isHost:self.is_host},input,now,{fullGame:true});
    const ref=input.intention.ref;const candidate=Object.values(state.proposals).find(value=>opaqueRef(value.proposal.id)===ref);
    if(candidate?.proposal.source==="player"){
      const analysis=await analyzeCustom(db,state,candidate.proposal.id);if(!analysis)commandFailure("AI_ANALYSIS_OFFLINE");
    }
  }
  if(state.selectedProposalId&&state.proposals[state.selectedProposalId]?.proposal.source==="player")customEffects=(await readAnalysis(db,state.roomId,state.selectedProposalId))?.recommendedEffects;
  const plan=planCommand(state,{playerId:credential.playerId,isHost:self.is_host},input,now,{fullGame:true,customEffects});
  if(!plan.states.length)return;
  const {error}=await db.rpc(plan.states.every(value=>value.round===1)&&state.phase!=="consequence"?"commit_round_one":"commit_gameplay",{p_room_id:credential.roomId,p_player_id:credential.playerId,p_token_hash:hashSessionToken(credential.token),p_expected_version:state.version,p_root_command_id:plan.root,p_steps:plan.states.map(value=>toPersistenceSnapshot(value,now))});
  if(error){if(error.message==="VERSION_CONFLICT")commandFailure("STATE_CHANGED");if(error.message==="INVALID_SESSION")throw Object.assign(new Error("Invalid session"),{code:"INVALID_SESSION"});commandFailure("INVALID_COMMAND");}
  await enhanceConsequence(db,plan.states.at(-1)!);
}
