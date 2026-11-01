import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { callsignSchema, entrySchema, memberActionSchema, roomCodeSchema } from "./validation";
import { cookieOptions, credentialForRequest, decodeCredential, encodeCredential, generateIssuanceSeed, generateRoomCode, roomCookieName } from "./identity";
import { enterRoom, getLobbyForMember, updateLobbyMember } from "./service";
import { publicLobbyError } from "./errors";
import { assertSameOrigin } from "./http";
import { authorizePlayerSession, hashSessionToken, verifySessionToken } from "@/lib/supabase/sessions";
import type { ServerDatabaseClient } from "@/lib/supabase/server";

const roomId="00000000-0000-4000-8000-000000000010";const playerId="00000000-0000-4000-8000-000000000001";
const requestId="00000000-0000-4000-8000-000000000099";const seed="A".repeat(43);
const token=credentialForRequest(seed,requestId);const credential={roomId,playerId,token};
function database(){
  const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:{token_hash:hashSessionToken(token),revoked_at:null},error:null})};
  const rpc=vi.fn().mockResolvedValue({data:{room_id:roomId,player_id:playerId,code:"7XK9"},error:null});
  return {query,rpc,client:{from:vi.fn().mockReturnValue(query),rpc} as unknown as ServerDatabaseClient};
}
describe("room input and identity",()=>{
  it("normalizes callsigns and codes",()=>{expect(callsignSchema.parse("  Maulik_7 -  ")).toBe("Maulik_7 -");expect(roomCodeSchema.parse(" 7xk9 ")).toBe("7XK9");});
  it.each(["A","A".repeat(21),"MA\nULIK","NAME\t","<script>","💀","  "])("rejects malformed callsign %s",value=>expect(callsignSchema.safeParse(value).success).toBe(false));
  it.each(["abc","bad!","A".repeat(9)])("rejects malformed room code %s",value=>expect(roomCodeSchema.safeParse(value).success).toBe(false));
  it("generates room codes using the unambiguous alphabet",()=>{for(let i=0;i<64;i++)expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);});
  it("creates strong request credentials and stable retry credentials",()=>{
    expect(generateIssuanceSeed()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(credentialForRequest(seed,requestId)).toBe(token);expect(token).not.toBe(seed);
    expect(verifySessionToken(token,hashSessionToken(token))).toBe(true);
    expect(credentialForRequest("B".repeat(43),requestId)).not.toBe(token);
  });
  it("round-trips only complete valid cookie credentials",()=>{
    expect(decodeCredential(encodeCredential(credential))).toEqual(credential);
    expect(decodeCredential(playerId)).toBeNull();expect(decodeCredential("MAULIK")).toBeNull();
    expect(roomCookieName("7XK9")).toBe("redline_room_7XK9");expect(cookieOptions).toMatchObject({httpOnly:true,sameSite:"lax",path:"/"});
  });
  it("rejects forged targets, host claims, unknown mode and cross-site requests",()=>{
    expect(memberActionSchema.safeParse({action:"ready",ready:true,playerId:"someone-else"}).success).toBe(false);
    expect(entrySchema.safeParse({operation:"create",requestId,callsign:"Maulik",mode:"cheat",isHost:true}).success).toBe(false);
    expect(()=>assertSameOrigin(new Request("http://localhost/api/rooms",{headers:{origin:"https://evil.test"}}))).toThrow();
    expect(()=>assertSameOrigin(new Request("http://localhost/api/rooms",{headers:{origin:"http://localhost"}}))).not.toThrow();
    expect(()=>assertSameOrigin(new Request("http://localhost:3000/api/rooms",{headers:{host:"127.0.0.1:3000",origin:"http://127.0.0.1:3000","x-forwarded-proto":"http"}}))).not.toThrow();
  });
});
describe("room service",()=>{
  it("creates a host/session through one transaction with only a hash",async()=>{
    const db=database();const result=await enterRoom(db.client,{operation:"create",requestId,callsign:"Maulik",mode:"demo"},seed,()=>"7XK9");
    expect(result.credential).toEqual(credential);expect(db.rpc).toHaveBeenCalledTimes(1);
    expect(db.rpc.mock.calls[0]).toMatchObject(["enter_lobby",{p_mode:"demo",p_operation:"create",p_callsign:"Maulik",p_token_hash:hashSessionToken(token)}]);
    expect(JSON.stringify(db.rpc.mock.calls)).not.toContain(token);
  });
  it("retries room-code collisions and stops after five failures",async()=>{
    const db=database();db.rpc.mockResolvedValueOnce({data:null,error:{message:"ROOM_CODE_COLLISION"}});
    const generate=vi.fn().mockReturnValueOnce("ABCD").mockReturnValue("EFGH");
    await enterRoom(db.client,{operation:"create",requestId,callsign:"Maulik",mode:"standard"},seed,generate);
    expect(generate).toHaveBeenCalledTimes(2);expect(db.rpc.mock.calls[0][1].p_token_hash).toBe(db.rpc.mock.calls[1][1].p_token_hash);
    db.rpc.mockReset().mockResolvedValue({data:null,error:{message:"ROOM_CODE_COLLISION"}});
    await expect(enterRoom(db.client,{operation:"create",requestId,callsign:"Maulik",mode:"standard"},seed,()=>"ABCD")).rejects.toMatchObject({code:"ROOM_CREATE_FAILED"});
    expect(db.rpc).toHaveBeenCalledTimes(5);
  });
  it.each(["ROOM_NOT_FOUND","ROOM_FULL","CALLSIGN_TAKEN","ROOM_IN_PROGRESS"])("returns safe %s join errors",async code=>{
    const db=database();db.rpc.mockResolvedValue({data:null,error:{message:code}});
    await expect(enterRoom(db.client,{operation:"join",requestId,callsign:"Maulik",roomCode:"7XK9"},seed)).rejects.toMatchObject({code});
    expect(db.rpc).toHaveBeenCalledTimes(1);
  });
  it("valid sessions restore without any player creation",async()=>{
    const db=database();const view={code:"7XK9",mode:"standard",status:"waiting",selfPlayerId:playerId,players:[]};
    db.rpc.mockResolvedValue({data:view,error:null});expect(await getLobbyForMember(db.client,"7XK9",credential)).toEqual(view);
    expect(db.rpc).toHaveBeenCalledWith("get_lobby_snapshot",expect.objectContaining({p_player_id:playerId}));
  });
  it("wrong and revoked credentials fail central verification",async()=>{
    const db=database();await expect(authorizePlayerSession(db.client,{...credential,token:"B".repeat(43)})).rejects.toMatchObject({code:"INVALID_SESSION"});
    db.query.maybeSingle.mockResolvedValue({data:{token_hash:hashSessionToken(token),revoked_at:"2042-01-01"},error:null});
    await expect(getLobbyForMember(db.client,"7XK9",credential)).rejects.toMatchObject({code:"INVALID_SESSION"});expect(db.rpc).not.toHaveBeenCalled();
  });
  it("a Room A session cannot access Room B",async()=>{
    const db=database();db.rpc.mockResolvedValue({data:null,error:{message:"INVALID_SESSION"}});
    await expect(getLobbyForMember(db.client,"OTHER",credential)).rejects.toMatchObject({code:"INVALID_SESSION"});
  });
  it("readiness derives the player from the verified credential",async()=>{
    const db=database();db.rpc.mockResolvedValue({data:null,error:null});
    await updateLobbyMember(db.client,credential,{action:"ready",ready:true});
    expect(db.rpc).toHaveBeenCalledWith("update_lobby_member",{p_room_id:roomId,p_player_id:playerId,p_token_hash:hashSessionToken(token),p_action:"ready",p_ready:true});
    expect(db.query.eq).toHaveBeenCalledWith("room_id",roomId);
  });
  it("does not expose SQL details in an error response",()=>expect(publicLobbyError({message:"SQL stack secret",code:"XX123"})).toMatchObject({code:"SERVICE_UNAVAILABLE"}));
});
