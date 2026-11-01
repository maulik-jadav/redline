import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { assignRoles } from "./assignment";
import { acknowledgeSchema, getBriefingContext, initiateCrisis, privateBriefingPayload, startSchema } from "./service";
import { BLACKOUT_ROLES } from "@/data/blackout/roles";
import { PLAYER_ROLES } from "@/types";
import { hashSessionToken } from "@/lib/supabase/sessions";
import type { BriefingContext } from "@/types/briefing";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import { briefingDestination } from "@/lib/realtime/navigation";
const roomId="00000000-0000-4000-8000-000000000010";
const credential={roomId,playerId:"00000000-0000-4000-8000-000000000001",token:"A".repeat(43)};
const commandId="00000000-0000-4000-8000-000000000099";
const players=Array.from({length:4},(_,i)=>({id:`00000000-0000-4000-8000-00000000000${i+1}`,displayName:`Operator ${i+1}`,isReady:true,isHost:i===0}));
const lobby=()=>({code:"TEST",mode:"demo" as const,status:"waiting" as const,selfPlayerId:credential.playerId,players:structuredClone(players)});
function db() {
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{token_hash:hashSessionToken(credential.token),revoked_at:null},error:null})};
  const rpc=vi.fn().mockImplementation(async(name:string)=>name==="get_lobby_snapshot"?{data:lobby(),error:null}:{data:null,error:null});
  return {query,rpc,client:{from:()=>query,rpc} as unknown as ServerDatabaseClient};
}
describe("deterministic initiation",()=>{
  it("assigns every role once, independent of roster ordering",()=>{
    const a=assignRoles(roomId,commandId,players);expect(Object.keys(a).sort()).toEqual([...PLAYER_ROLES].sort());
    expect(new Set(Object.values(a)).size).toBe(4);expect(a).toEqual(assignRoles(roomId,commandId,[...players].reverse()));
    expect(Array.from({length:20},(_,i)=>JSON.stringify(assignRoles(roomId,`${commandId}-${i}`,players))).some(value=>value!==JSON.stringify(a))).toBe(true);
  });
  it("excludes left players and rejects incomplete/duplicate active rosters",()=>{
    expect(assignRoles(roomId,commandId,[...players,{id:"left",left_at:"2042-01-01"}])).toEqual(assignRoles(roomId,commandId,players));
    expect(()=>assignRoles(roomId,commandId,players.slice(0,3))).toThrow();expect(()=>assignRoles(roomId,commandId,[players[0],players[0],players[2],players[3]])).toThrow();
  });
  it.each(["NOT_HOST","ROOM_NOT_FULL","PLAYERS_NOT_READY","ROOM_ALREADY_STARTED"])("rejects %s before persistence",async(code)=>{
    const database=db();const snapshot=lobby();
    if(code==="NOT_HOST")snapshot.players[0].isHost=false;
    if(code==="ROOM_NOT_FULL")snapshot.players.pop();
    if(code==="PLAYERS_NOT_READY")snapshot.players[1].isReady=false;
    const value=code==="ROOM_ALREADY_STARTED"?{...snapshot,status:"active"}:snapshot;
    database.rpc.mockResolvedValue({data:value,error:null});
    await expect(initiateCrisis(database.client,"TEST",credential,commandId)).rejects.toMatchObject({code});expect(database.rpc).toHaveBeenCalledTimes(1);
  });
  it("uses canonical engine snapshots and an atomic start RPC",async()=>{
    const database=db();await initiateCrisis(database.client,"TEST",credential,commandId,"2042-01-01T00:00:00.000Z");
    const [,args]=database.rpc.mock.calls[1];expect(database.rpc.mock.calls[1][0]).toBe("initiate_crisis");
    expect(args.p_started.game_state).toMatchObject({phase:"briefing",status:"active",version:1,round:null});
    expect(args.p_started.player_abilities.map((row:{max_uses:number})=>row.max_uses).sort()).toEqual([1,1,2,3]);
    expect(args.p_started.timeline).toHaveLength(1);expect(args.p_started.processed_commands[0].command_id).toBe(commandId);
    expect(JSON.stringify(args)).not.toContain(credential.token);
  });
  it("does not accept role selection or another acknowledgement target",()=>{
    expect(startSchema.safeParse({commandId,role:"engineer"}).success).toBe(false);
    expect(acknowledgeSchema.safeParse({action:"acknowledge",playerId:"someone-else"}).success).toBe(false);
  });
});
describe("one-player private briefing payload",()=>{
  it.each(PLAYER_ROLES)("delivers only %s canonical private data",role=>{
    const definition=BLACKOUT_ROLES[role];
    const context:BriefingContext={self:{role,displayName:"Current player",uses:definition.ability.maxUses},status:{code:"TEST",status:"active",phase:"briefing",selfPlayerId:credential.playerId,acknowledgedCount:0,allAcknowledged:false,operators:players.map(p=>({id:p.id,displayName:p.displayName,acknowledged:false}))}};
    const response=privateBriefingPayload(context);const json=JSON.stringify(response);
    expect(response).toMatchObject({role,secret:definition.secret,characterName:definition.characterName,objective:{name:definition.primaryObjective.name},ability:{name:definition.ability.name,description:definition.ability.description,uses:definition.ability.maxUses}});
    for(const other of PLAYER_ROLES.filter(value=>value!==role)){expect(json).not.toContain(BLACKOUT_ROLES[other].secret);expect(json).not.toContain(BLACKOUT_ROLES[other].primaryObjective.name);expect(json).not.toContain(BLACKOUT_ROLES[other].ability.name);}
    expect(privateBriefingPayload(context)).toEqual(response);
  });
  it.each(["INVALID_SESSION","ROOM_NOT_STARTED","BRIEFING_UNAVAILABLE"])("does not return private data on %s",async(code)=>{
    const database=db();database.rpc.mockResolvedValue({data:null,error:{message:code}});
    await expect(getBriefingContext(database.client,"TEST",credential)).rejects.toMatchObject({code});
  });
  it("detects active snapshots for navigation without role data",()=>{
    expect(briefingDestination(lobby())).toBeNull();expect(briefingDestination({...lobby(),status:"active"})).toBe("/briefing/TEST");
  });
});
