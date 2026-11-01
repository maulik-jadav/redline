import { BLACKOUT_SCENARIO } from "@/data/blackout";
import type { CanonicalResponseId } from "@/data/blackout";
import type { EvidenceKey, NormalVoteChoice, PlayerId,MetricEffects } from "@/types";
import { rewardDraft } from "./collaboration";
import { canonicalResponse, executeCanonicalDraft } from "./decisions";
import { reject } from "./errors";
import { publicationItems } from "./evidence";
import { normalRound, requirePhase, requirePlayer, validId } from "./guards";
import { applyEffectsDraft } from "./metrics";
import type { Actor, CommandContext, EngineState } from "./runtime";
import { record } from "./timeline";
import { command } from "./transaction";

export function createProposal(state: EngineState, input: { proposalId: string; playerId: PlayerId; title: string; action: string; reason: string }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "discussion"); requirePlayer(draft, input.playerId);
    const round = normalRound(draft); validId(input.proposalId);
    if (Object.hasOwn(draft.proposals, input.proposalId) || !input.title.trim() || !input.action.trim() || !input.reason.trim()) reject("INVALID_PROPOSAL", "Proposal ID must be unique and text nonempty.");
    if (Object.values(draft.proposals).some(({ proposal }) => proposal.source === "player" && proposal.creatorPlayerId === input.playerId &&
      proposal.round === round && ["pending", "selected", "voting"].includes(proposal.status))) reject("INVALID_PROPOSAL", "Player already has an active proposal.");
    draft.proposals[input.proposalId] = { disclosureEvidence: [], proposal: {
      id: input.proposalId, roomId: draft.roomId, round, creatorPlayerId: input.playerId,
      title: input.title, action: input.action, reason: input.reason, source: "player", status: "pending",
    } };
  });
}

export function addCanonicalDraft(state: EngineState, proposalId: string, responseId: CanonicalResponseId, evidence: readonly EvidenceKey[] = []): void {
  validId(proposalId);
  if (Object.hasOwn(state.proposals, proposalId)) reject("INVALID_PROPOSAL", "Proposal ID already exists.");
  const response = canonicalResponse(state, responseId);
  state.proposals[proposalId] = { canonicalResponseId: responseId, disclosureEvidence: [...evidence], proposal: {
    id: proposalId, roomId: state.roomId, round: normalRound(state), source: "canonical", status: "pending",
    title: response.title, action: response.id, reason: "Canonical response protocol.",
  } };
}

export function createCanonicalProposal(state: EngineState, input: { proposalId: string; responseId: CanonicalResponseId; playerId: PlayerId; evidenceKeys?: EvidenceKey[] }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "discussion"); requirePlayer(draft, input.playerId);
    addCanonicalDraft(draft, input.proposalId, input.responseId, input.evidenceKeys);
    draft.proposals[input.proposalId].initiatedBy = input.playerId;
  });
}

export function selectDraft(state: EngineState, proposalId: string, actor: Actor, context: CommandContext, emergency = false): void {
  requirePhase(state, "discussion", "response_selection"); requirePlayer(state, actor.playerId);
  normalRound(state);
  if (!emergency && actor.isHost !== true) reject("INVALID_PLAYER", "Host authorization required.");
  const selected = state.proposals[proposalId];
  if (!selected || !Object.hasOwn(state.proposals, proposalId) || selected.proposal.round !== state.round || selected.proposal.status !== "pending") reject("INVALID_PROPOSAL", "Proposal is not eligible.");
  if (state.phase === "response_selection" && selected.proposal.source !== "canonical") reject("INVALID_PROPOSAL", "Timeout selection requires a canonical response.");
  if (selected.canonicalResponseId && canonicalResponse(state, selected.canonicalResponseId).kind === "public_disclosure") {
    publicationItems(state, actor.playerId, selected.disclosureEvidence);
  }
  selected.proposal.status = "voting"; selected.selectedBy = actor.playerId;
  state.selectedProposalId = proposalId; state.votes[proposalId] = []; state.phase = "voting";
  record(state, context, "proposal_selected", selected.proposal.title, actor.playerId, { proposalId });
}

export function selectProposal(state: EngineState, input: { proposalId: string; actor: Actor }, context: CommandContext) {
  return command(state, context, draft => selectDraft(draft, input.proposalId, input.actor, context));
}

/** Host's canonical choice during the bounded response-selection window. */
export function selectCanonicalResponse(state:EngineState,input:{proposalId:string;responseId:CanonicalResponseId;actor:Actor;evidenceKeys?:EvidenceKey[]},context:CommandContext) {
  return command(state,context,draft=>{
    requirePhase(draft,"response_selection");
    if(input.actor.isHost!==true)reject("INVALID_PLAYER","Host authorization required.");
    addCanonicalDraft(draft,input.proposalId,input.responseId,input.evidenceKeys);
    selectDraft(draft,input.proposalId,input.actor,context);
  });
}

/** Called explicitly by the future server when the host selection window expires. */
export function selectDefaultResponse(state: EngineState, input: { proposalId: string }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "response_selection");
    const response = BLACKOUT_SCENARIO.rounds[normalRound(draft)].defaultResponse;
    addCanonicalDraft(draft, input.proposalId, response);
    // System fallback does not impersonate a host or contribute player attribution.
    const selected = draft.proposals[input.proposalId];
    selected.proposal.status = "voting";
    draft.selectedProposalId = input.proposalId; draft.votes[input.proposalId] = []; draft.phase = "voting";
    record(draft, context, "proposal_selected", selected.proposal.title, undefined, { proposalId: input.proposalId });
  });
}

export function submitNormalVote(state: EngineState, input: { proposalId: string; playerId: PlayerId; choice: NormalVoteChoice }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "voting"); requirePlayer(draft, input.playerId); normalRound(draft);
    if (draft.selectedProposalId !== input.proposalId || !["approve", "reject"].includes(input.choice)) reject("INVALID_VOTE", "Vote does not target the selected proposal.");
    const votes = draft.votes[input.proposalId];
    if (votes.some(vote => vote.playerId === input.playerId)) reject("ALREADY_VOTED", "Normal votes cannot change.");
    votes.push({ ...input });
    rewardDraft(draft, "voteParticipation", JSON.stringify([input.proposalId, input.playerId]), input.playerId);
  });
}

export function finalizeNormalVote(state: EngineState, input: { reason: "all_votes" | "timeout" | "approval_threshold"; customEffects?:MetricEffects }, context: CommandContext) {
  return command(state, context, draft => {
    requirePhase(draft, "voting"); const round = normalRound(draft);
    const id = draft.selectedProposalId;
    if (!id || draft.resolvedRounds.includes(round)) reject("INVALID_PROPOSAL", "Round already resolved or no selection.");
    const runtime = draft.proposals[id]; const votes = draft.votes[id];
    if (!["all_votes", "timeout", "approval_threshold"].includes(input.reason)) reject("INVALID_INPUT", "Finalization reason required.");
    if(input.reason==="approval_threshold"&&votes.filter(vote=>vote.choice==="approve").length<BLACKOUT_SCENARIO.rules.normalVote.requiredApprovals)reject("INVALID_VOTE","Approval threshold not reached.");
    if (input.reason === "all_votes" && votes.length !== BLACKOUT_SCENARIO.rules.normalVote.totalPlayers) reject("INVALID_VOTE", "Not all players have voted.");
    const approved = votes.filter(vote => vote.choice === "approve").length >= BLACKOUT_SCENARIO.rules.normalVote.requiredApprovals;
    runtime.proposal.status = approved ? "approved" : "rejected"; draft.phase = "resolution";
    record(draft, context, "vote_outcome", approved ? "DECISION AUTHORIZED" : "DECISION REJECTED", undefined, { proposalId: id });
    if (approved && runtime.canonicalResponseId) {
      const participants = votes.filter(vote => vote.choice === "approve").map(vote => vote.playerId);
      if (runtime.selectedBy && !participants.includes(runtime.selectedBy)) participants.push(runtime.selectedBy);
      if (runtime.initiatedBy && !participants.includes(runtime.initiatedBy)) participants.push(runtime.initiatedBy);
      const publisher = runtime.selectedBy ?? participants[0];
      executeCanonicalDraft(draft, runtime.canonicalResponseId, publisher, runtime.disclosureEvidence, participants, context);
      runtime.proposal.status = "executed";
    } else if (approved && runtime.proposal.source === "player") {
      if(input.customEffects){
        for(const [key,value] of Object.entries(input.customEffects)) {
          if(!["grid","safety","economy","trust","cascadeRisk"].includes(key)||!Number.isInteger(value)||Math.abs(value)>(key==="cascadeRisk"?BLACKOUT_SCENARIO.rules.customActionDeltaBounds.cascadeRisk.max:BLACKOUT_SCENARIO.rules.customActionDeltaBounds.publicMetrics.max))reject("INVALID_INPUT","Custom effects exceed accepted bounds.");
        }
        applyEffectsDraft(draft,input.customEffects);
      }
      rewardDraft(draft, "successfulPlayerProposal", id, runtime.proposal.creatorPlayerId);
      record(draft, context, "decision_executed", input.customEffects?"Validated custom response executed.":"Player proposal approved; custom effects are not implemented.", runtime.proposal.creatorPlayerId, { proposalId: id });
    } else {
      applyEffectsDraft(draft, BLACKOUT_SCENARIO.rounds[round].inactionEffects);
      record(draft, context, "inaction_consequence", "Rejected proposal: canonical inaction consequence applied.", undefined, { proposalId: id });
    }
    draft.resolvedRounds.push(round);
    for (const other of Object.values(draft.proposals)) if (other.proposal.round === round && other.proposal.status === "pending") other.proposal.status = "expired";
    draft.phase = "consequence";
  });
}
