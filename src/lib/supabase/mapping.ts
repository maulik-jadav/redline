/** Pure representation mapping. No game rules or database calls. */
import type { EngineState, EngineTimelineEntry, RuntimeProposal } from "@/lib/game";
import type { Evidence, GameState, RoleAbility, RoleAbilityId } from "@/types";
import type { EvidenceRow, GameStateRow, PersistenceSnapshot, ProposalRow } from "./database.types";

const iso = (value: string) => new Date(value).toISOString();
const ordered = <T extends { sequence_no: number }>(rows: T[]) => [...rows].sort((a,b)=>a.sequence_no-b.sequence_no);

export function rowToGameState(row: GameStateRow): GameState {
  return {
    roomId: row.room_id, scenarioId: row.scenario_id, mode: row.mode, status: row.status, phase: row.phase,
    metrics: { grid: row.grid, safety: row.safety, economy: row.economy, trust: row.trust },
    hiddenMetrics: { cascadeRisk: row.cascade_risk }, collaborationScore: row.collaboration_score,
    scenarioFlags: { helixExposed: row.helix_exposed, informationSuppressed: row.information_suppressed,
      suppressionExposed: row.suppression_exposed, trueCauseDiscovered: row.true_cause_discovered,
      confirmedWrongdoingPublished: row.confirmed_wrongdoing_published, s7Isolated: row.s7_isolated },
    version: row.version,
    ...(row.round === null ? {} : { round: row.round }),
    ...(row.selected_proposal_id === null ? {} : { selectedProposalId: row.selected_proposal_id }),
    ...(row.active_event_id === null ? {} : { activeEventId: row.active_event_id }),
    ...(row.phase_ends_at === null ? {} : { phaseEndsAt: iso(row.phase_ends_at) }),
    ...(row.started_at === null ? {} : { startedAt: iso(row.started_at) }),
    ...(row.completed_at === null ? {} : { completedAt: iso(row.completed_at) }),
  };
}

export function gameStateToRow(state: EngineState, occurredAt: string): GameStateRow {
  return {
    room_id: state.roomId, scenario_id: state.scenarioId, mode: state.mode, status: state.status, phase: state.phase,
    round: state.round ?? null, grid: state.metrics.grid, safety: state.metrics.safety, economy: state.metrics.economy,
    trust: state.metrics.trust, cascade_risk: state.hiddenMetrics.cascadeRisk, collaboration_score: state.collaborationScore,
    helix_exposed: state.scenarioFlags.helixExposed, information_suppressed: state.scenarioFlags.informationSuppressed,
    suppression_exposed: state.scenarioFlags.suppressionExposed, true_cause_discovered: state.scenarioFlags.trueCauseDiscovered,
    confirmed_wrongdoing_published: state.scenarioFlags.confirmedWrongdoingPublished, s7_isolated: state.scenarioFlags.s7Isolated,
    selected_proposal_id: state.selectedProposalId ?? null, active_event_id: state.activeEventId ?? null,
    phase_ends_at: state.phaseEndsAt ?? null, started_at: state.startedAt ?? null, completed_at: state.completedAt ?? null,
    version: state.version, updated_at: occurredAt, map: structuredClone(state.map), round_start_metrics:state.roundStartMetrics??null,role_assignments: { ...state.roleAssignments },
    resolved_rounds: [...state.resolvedRounds], executed_responses: [...state.executedResponses],
    suppression_evidence_snapshot: [...state.suppressionEvidence], contributions: { ...state.contributions },
    redline_resolution: state.redlineResolution ?? null, result: state.result ? structuredClone(state.result) : null,
  };
}

export function evidenceFromRow(row: EvidenceRow): Evidence {
  return { id: row.id, roomId: row.room_id, key: row.key, title: row.title, description: row.description,
    visibility: row.visibility, verification: row.verification,
    ...(row.owner_player_id === null ? {} : { ownerPlayerId: row.owner_player_id }),
    ...(row.discovered_round === null ? {} : { discoveredRound: row.discovered_round }) };
}

function proposalFromRow(row: ProposalRow): RuntimeProposal {
  const common = { id: row.id, roomId: row.room_id, round: row.round, title: row.title, action: row.action, reason: row.reason, status: row.status };
  if (row.source === "player" && row.creator_player_id === null) throw new Error("Player proposal lacks its creator.");
  return {
    proposal: row.source === "player" ? { ...common, source: "player", creatorPlayerId: row.creator_player_id! } : { ...common, source: "canonical" },
    disclosureEvidence: [...row.disclosure_evidence],
    ...(row.canonical_response_id === null ? {} : { canonicalResponseId: row.canonical_response_id }),
    ...(row.selected_by === null ? {} : { selectedBy: row.selected_by }),
    ...(row.initiated_by === null ? {} : { initiatedBy: row.initiated_by }),
  };
}

export function toPersistenceSnapshot(state: EngineState, occurredAt: string): PersistenceSnapshot {
  const room_id = state.roomId;
  return {
    game_state: gameStateToRow(state,occurredAt),
    proposals: Object.values(state.proposals).map((runtime,sequence_no)=>({
      id: runtime.proposal.id, room_id, sequence_no, round: runtime.proposal.round,
      creator_player_id: runtime.proposal.source === "player" ? runtime.proposal.creatorPlayerId : null,
      title: runtime.proposal.title, action: runtime.proposal.action, reason: runtime.proposal.reason,
      source: runtime.proposal.source, status: runtime.proposal.status,
      canonical_response_id: runtime.canonicalResponseId ?? null, disclosure_evidence: [...runtime.disclosureEvidence],
      selected_by: runtime.selectedBy ?? null, initiated_by: runtime.initiatedBy ?? null,
      created_at: occurredAt, resolved_at: ["approved","rejected","executed","expired"].includes(runtime.proposal.status)
        ? state.timeline.find(entry=>entry.type==="vote_outcome" && entry.round===runtime.proposal.round &&
            (runtime.proposal.status==="expired" || entry.proposalId===runtime.proposal.id))?.occurredAt ?? occurredAt : null,
    })),
    votes: Object.values(state.votes).flatMap(votes=>votes.map((vote,sequence_no)=>({
      room_id, proposal_id: vote.proposalId, player_id: vote.playerId, choice: vote.choice, sequence_no, created_at: occurredAt,
    }))),
    redline_ballots: Object.entries(state.redlineSelections).map(([player_id,choice])=>({ room_id,player_id,choice: choice!,updated_at: occurredAt })),
    evidence: Object.values(state.evidence).map((item,sequence_no)=>({
      id: item.id, room_id, sequence_no, key: item.key, title: item.title, description: item.description,
      owner_player_id: item.ownerPlayerId ?? null, visibility: item.visibility, verification: item.verification,
      discovered_round: item.discoveredRound ?? null, created_at: occurredAt, updated_at: occurredAt,
    })),
    player_abilities: Object.values(state.abilities).map(ability=>({room_id, player_id: state.roleAssignments[ability.ownerRole],
      ability_id: ability.id, owner_role: ability.ownerRole, max_uses: ability.maxUses, uses_remaining: ability.remainingUses, updated_at: occurredAt})),
    events: state.events.map((event,sequence_no)=>({room_id,id: event.id,sequence_no,round: event.round ?? null,type: event.type,
      severity: event.severity,headline: event.headline,description: event.description,metric_effects: event.metricEffects ? {...event.metricEffects} : null})),
    timeline: state.timeline.map((entry,sequence_no)=>{
      const {id,type,message,occurredAt,round,playerId,roomId: _roomId,...metadata}=entry;
      void _roomId;
      return {room_id,id,sequence_no,type,message,occurred_at: occurredAt,round: round ?? null,player_id: playerId ?? null,metadata: structuredClone(metadata)};
    }),
    private_intel: state.privateIntel.map((intel,sequence_no)=>{
      if(intel.evidenceKey && state.evidence[intel.evidenceKey]?.description !== intel.text) throw new Error("Linked intelligence content differs from evidence.");
      return {room_id,id: intel.id,sequence_no,player_id: intel.ownerPlayerId,round: intel.round,
        content: intel.evidenceKey ? null : intel.text,confidence: intel.confidence ?? null,
        additional_clues: intel.additionalClues ? [...intel.additionalClues] : null,visibility: intel.visibility,evidence_key: intel.evidenceKey ?? null};
    }),
    processed_commands: state.processedCommands.map((command_id,sequence_no)=>({room_id,command_id,sequence_no,processed_at: occurredAt})),
    collaboration_rewards: state.collaborationRewards.map((reward_key,sequence_no)=>({room_id,reward_key,sequence_no})),
  };
}

export function fromPersistenceSnapshot(snapshot: PersistenceSnapshot): EngineState {
  const row = snapshot.game_state;
  const proposals = Object.fromEntries(ordered(snapshot.proposals).map(row=>[row.id,proposalFromRow(row)]));
  const votes: EngineState["votes"] = {};
  for(const runtime of Object.values(proposals)) if(["voting","approved","rejected","executed"].includes(runtime.proposal.status)) votes[runtime.proposal.id]=[];
  for(const vote of ordered(snapshot.votes)) (votes[vote.proposal_id] ??= []).push({proposalId: vote.proposal_id,playerId: vote.player_id,choice: vote.choice});
  const evidence = Object.fromEntries(ordered(snapshot.evidence).map(row=>[row.key,evidenceFromRow(row)]));
  return {
    ...rowToGameState(row),...(row.round_start_metrics?{roundStartMetrics:{...row.round_start_metrics}}:{}),roleAssignments: {...row.role_assignments},map: structuredClone(row.map),proposals,votes,evidence,
    abilities: Object.fromEntries(snapshot.player_abilities.map(row=>[row.ability_id,{
      id: row.ability_id,ownerRole: row.owner_role,maxUses: row.max_uses,remainingUses: row.uses_remaining,
    }])) as Record<RoleAbilityId,RoleAbility>,
    events: ordered(snapshot.events).map(event=>({id:event.id,roomId:event.room_id,type:event.type,severity:event.severity,
      headline:event.headline,description:event.description,...(event.round===null?{}:{round:event.round}),
      ...(event.metric_effects===null?{}:{metricEffects:{...event.metric_effects}})})),
    timeline: ordered(snapshot.timeline).map(entry=>({id:entry.id,roomId:entry.room_id,type:entry.type,message:entry.message,
      occurredAt:iso(entry.occurred_at),...(entry.round===null?{}:{round:entry.round}),...(entry.player_id===null?{}:{playerId:entry.player_id}),
      ...structuredClone(entry.metadata)} satisfies EngineTimelineEntry)),
    privateIntel: ordered(snapshot.private_intel).map(intel=>{
      const text=intel.evidence_key ? evidence[intel.evidence_key]?.description : intel.content;
      if(text===null || text===undefined) throw new Error("Missing intelligence content.");
      return {id:intel.id,ownerPlayerId:intel.player_id,round:intel.round,text,visibility:intel.visibility,
        ...(intel.confidence===null?{}:{confidence:intel.confidence}),...(intel.additional_clues===null?{}:{additionalClues:[...intel.additional_clues]}),
        ...(intel.evidence_key===null?{}:{evidenceKey:intel.evidence_key})};
    }),
    resolvedRounds:[...row.resolved_rounds],executedResponses:[...row.executed_responses],suppressionEvidence:[...row.suppression_evidence_snapshot],
    contributions:{...row.contributions},processedCommands:ordered(snapshot.processed_commands).map(row=>row.command_id),
    collaborationRewards:ordered(snapshot.collaboration_rewards).map(row=>row.reward_key),
    redlineSelections:Object.fromEntries(snapshot.redline_ballots.map(row=>[row.player_id,row.choice])),
    ...(row.redline_resolution===null?{}:{redlineResolution:row.redline_resolution}),...(row.result===null?{}:{result:structuredClone(row.result)}),
  };
}
