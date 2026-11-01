export const ACTION_CATEGORIES=["grid_stabilization","civilian_protection","economic_support","public_communication","investigation"] as const;
export type ActionCategory=typeof ACTION_CATEGORIES[number];
