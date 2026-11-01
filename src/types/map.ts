export type SectorId =
  | "north"
  | "west"
  | "central"
  | "industrial"
  | "medical"
  | "sector_7";

export type SectorStatus = "stable" | "warning" | "critical" | "offline";

/** Transit is network infrastructure, not a seventh physical sector. */
export interface GridMapState {
  sectors: Record<SectorId, SectorStatus>;
  transit: SectorStatus;
}
