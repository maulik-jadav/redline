import { z } from "zod";

export const callsignSchema=z.string().regex(/^[^\u0000-\u001f\u007f]*$/).trim().min(2).max(20).regex(/^[A-Za-z0-9 _-]+$/);
export const roomCodeSchema=z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/);
export const entrySchema=z.discriminatedUnion("operation",[
  z.object({operation:z.literal("create"),requestId:z.uuid(),callsign:callsignSchema,mode:z.enum(["standard","demo"])}).strict(),
  z.object({operation:z.literal("join"),requestId:z.uuid(),callsign:callsignSchema,roomCode:roomCodeSchema}).strict(),
]);
export type EntryInput=z.infer<typeof entrySchema>;
export const memberActionSchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("ready"),ready:z.boolean()}).strict(),
  z.object({action:z.literal("leave")}).strict(),
]);
export const credentialSchema=z.object({roomId:z.uuid(),playerId:z.uuid(),token:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict();
