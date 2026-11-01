export type RoomId = string;
export type PlayerId = string;
export type ProposalId = string;
export type EvidenceId = string;
export type EventId = string;
export type TimelineEntryId = string;

/** ISO 8601 string at persistence and network boundaries; never a Date object. */
export type IsoTimestamp = string;

/** REDLINE Protocol is the final decision, not a sixth round. */
export type RoundNumber = 1 | 2 | 3 | 4 | 5;
