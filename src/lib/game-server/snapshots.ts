import "server-only";
import { createHash } from "node:crypto";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { EngineState } from "@/lib/game";
import type { CrisisSnapshot,CrisisProposal,RoundOneResponse } from "@/types/crisis";
import type { CrisisMember } from "@/lib/supabase/database.types";
export const opaqueRef=(id:string)=>createHash("sha256").update(id).digest("hex").slice(0,32);
const descriptions:Partial<Record<RoundOneResponse,string>>={r1_reduce_sector_7_load:"Apply load restrictions to Sector 7.",r1_maintain_normal_operations:"Keep the current operating protocol in place.",r1_investigate_before_acting:"Investigate the anomaly before changing operations."};
/** The explicit browser projection. Never serialize EngineState or arbitrary metadata. */
export function crisisSnapshot(state:EngineState,members:CrisisMember[],selfId:string,code:string,now:string):CrisisSnapshot {
  const self=members.find(player=>player.id===selfId)!;
  const name=(id:string|undefined)=>members.find(player=>player.id===id)?.display_name??"SYSTEM";
  const proposals=Object.values(state.proposals).filter(value=>value.proposal.round===state.round).map(({proposal}):CrisisProposal=>({ref:opaqueRef(proposal.id),title:proposal.title,action:proposal.source==="canonical"?"Canonical response protocol.":proposal.action,reason:proposal.reason,source:proposal.source,creator:name(proposal.creatorPlayerId),status:proposal.status}));
  const selected=state.selectedProposalId?proposals.find(value=>value.ref===opaqueRef(state.selectedProposalId!))??null:null;
  const intel=(value:EngineState["privateIntel"][number])=>({ref:opaqueRef(value.id),text:[value.text,...(value.additionalClues??[])].join("\n"),confidence:value.confidence??"unrated",visibility:value.visibility,owner:name(value.ownerPlayerId),formal:!!value.evidenceKey});
  const resolved=state.phase==="consequence"&&state.resolvedRounds.includes(state.round!);
  const initial=state.roundStartMetrics??BLACKOUT_SCENARIO.initialState.metrics;
  const authorized=!!selected&&["approved","executed"].includes(selected.status);
  const metrics={grid:state.metrics.grid,safety:state.metrics.safety,economy:state.metrics.economy,trust:state.metrics.trust};
  const safeTimeline=new Set(["game_start","briefing_completed","round_start","intelligence_shared","ability_used","proposal_selected","vote_outcome","decision_executed","inaction_consequence","public_disclosure","helix_exposed","suppression_exposed","redline_activated","final_vote","ending"]);
  const customApplied=state.timeline.some(entry=>entry.round===state.round&&entry.message==="Validated custom response executed.");
  const activeEvent=state.events.find(value=>value.id===state.activeEventId);
  const result={
    code,scenario:"BLACKOUT",mode:state.mode,phase:state.phase,round:state.round??null,roundName:state.round?BLACKOUT_SCENARIO.rounds[state.round].name:"BLACKOUT",resultsReady:state.phase==="results"&&(!state.phaseEndsAt||Date.parse(now)>=Date.parse(state.phaseEndsAt)),version:state.version,serverNow:now,phaseEndsAt:state.phaseEndsAt??null,
    roundComplete:resolved&&(!state.phaseEndsAt||Date.parse(now)>=Date.parse(state.phaseEndsAt)),metrics,map:structuredClone(state.map),
    self:{playerId:selfId,role:self.role!,callsign:self.display_name,isHost:self.is_host,mayorUses:self.role==="mayor"?state.abilities.emergency_order.remainingUses:0,ability:{name:BLACKOUT_SCENARIO.roles[self.role!].ability.name,description:BLACKOUT_SCENARIO.roles[self.role!].ability.description,uses:state.abilities[BLACKOUT_SCENARIO.roles[self.role!].ability.id].remainingUses}},
    operators:members.map(player=>({presenceId:player.id,name:player.display_name,role:player.role!,isHost:player.is_host,vote:state.selectedProposalId?state.votes[state.selectedProposalId]?.find(vote=>vote.playerId===player.id)?.choice??null:null})),
    ownIntel:state.privateIntel.filter(value=>value.round<=(state.round??0)&&value.ownerPlayerId===selfId).map(intel),
    sharedIntel:state.privateIntel.filter(value=>value.round<=(state.round??0)&&value.visibility!=="private").map(intel),
    ownEvidence:Object.values(state.evidence).filter(value=>value&&(value.discoveredRound??99)<=(state.round??0)&&(value.ownerPlayerId===selfId||value.visibility!=="private")).map(value=>({ref:opaqueRef(value!.id),title:value!.title,text:value!.description,verification:value!.verification,visibility:value!.visibility})),
    proposals,selected,responses:state.round&&state.round<5?Object.values(BLACKOUT_SCENARIO.rounds[state.round as 1|2|3|4].responses).map(value=>({id:value.id,title:value.title,description:descriptions[value.id as RoundOneResponse]??"Nominate this canonical response for the team to authorize."})):[],
    sharedEvidence:Object.values(state.evidence).filter(value=>value&&value.visibility!=="private"&&(value.discoveredRound??99)<=(state.round??0)).map(value=>({ref:opaqueRef(value!.id),title:value!.title,text:value!.description,verification:value!.verification,visibility:value!.visibility})),
    redline:{options:Object.values(BLACKOUT_SCENARIO.redline.options).map(value=>({id:value.id,name:value.name,description:value.description.includes("{cascadeRisk}")?"ORACLE: Cascade risk assessment remains restricted.":value.description})),selections:members.map(player=>({name:player.display_name,choice:state.redlineSelections[player.id]??null}))},broadcasts:[] as {channel:string;line:string}[],finalResponse:state.redlineResolution?{headline:state.redlineResolution==="deadlock"?"REDLINE DEADLOCK":`${BLACKOUT_SCENARIO.redline.options[state.redlineResolution].name} AUTHORIZED`,description:state.redlineResolution==="deadlock"?"NO CONSENSUS REACHED — The city outcome has been determined.":"Final response applied. City outcome recorded."}:null,
    activeEvent:activeEvent?{headline:activeEvent.headline,description:activeEvent.description}:null,
    events:state.events.filter(value=>(value.round??99)<=(state.round??0)).map(value=>({kind:value.type,severity:value.severity,key:opaqueRef(value.id),headline:value.headline,description:value.description.includes("{cascadeRisk}")?"ORACLE: Cascade risk assessment remains restricted.":value.description})),
    timeline:state.timeline.filter(value=>safeTimeline.has(value.type)).map(value=>({key:opaqueRef(value.id),message:value.message==="Player proposal approved; custom effects are not implemented."?"CUSTOM RESPONSE AUTHORIZED — Operational impact analysis pending.":value.message,actor:value.playerId?name(value.playerId):null,occurredAt:value.occurredAt})),
    consequence:resolved?{authorized,custom:selected?.source==="player"&&authorized,title:selected?.title??`ROUND ${state.round} RESPONSE`,description:!authorized?"Decision rejected. The canonical inaction consequence has been applied.":selected?.source==="player"?(customApplied?"The validated custom response has been applied. City status updated.":"CUSTOM RESPONSE AUTHORIZED — Operational impact analysis pending."):"The authorized response protocol has been applied. City status updated.",deltas:{grid:metrics.grid-initial.grid,safety:metrics.safety-initial.safety,economy:metrics.economy-initial.economy,trust:metrics.trust-initial.trust}}:null,
  } satisfies CrisisSnapshot;
  if(state.timeline.some(value=>value.type==="helix_exposed"))result.broadcasts.push({channel:"NOVUS NEWS NETWORK",line:BLACKOUT_SCENARIO.fallbackContent.disclosures.confirmedHelix.description});
  if(state.timeline.some(value=>value.type==="suppression_exposed"))result.broadcasts.push({channel:"NOVUS NEWS NETWORK",line:"COVER-UP EXPOSED — Previously suppressed confirmed evidence is now public."});
  return result;
}
