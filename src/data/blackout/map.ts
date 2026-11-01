import type { GridMapState, SectorId } from "@/types";

export const BLACKOUT_SECTORS = {
  north: "North", west: "West", central: "Central",
  industrial: "Industrial", medical: "Medical", sector_7: "Sector 7",
} as const satisfies Record<SectorId, string>;

export const BLACKOUT_INITIAL_MAP = {
  sectors: {
    north: "stable", west: "stable", central: "stable",
    industrial: "stable", medical: "stable", sector_7: "stable",
  },
  transit: "stable",
} as const satisfies GridMapState;
