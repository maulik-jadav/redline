import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { hashSessionToken, verifySessionToken } from "./sessions";
import { getEvidenceForPlayer } from "./repositories/evidence";
import { persistGameStateWithVersion } from "./repositories/game-state";
import type { ServerDatabaseClient } from "./server";
import { accepted, harness } from "@/lib/game/test-fixtures";
import { startGame } from "@/lib/game";

describe("server session/persistence boundary",()=>{
  it("stores only deterministic SHA-256 hashes and compares credentials",()=>{
    const token="A".repeat(43); const hash=hashSessionToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/); expect(hash).not.toBe(token);
    expect(verifySessionToken(token,hash)).toBe(true);
    expect(verifySessionToken("B".repeat(43),hash)).toBe(false);
    expect(verifySessionToken("invalid",hash)).toBe(false);
  });
  it("rejects a room code or player ID offered as a credential",()=>{
    expect(()=>hashSessionToken("7XK9")).toThrow(); expect(()=>hashSessionToken("maya")).toThrow();
  });
  it("verifies sessions before issuing an owner/visibility-filtered evidence query",async()=>{
    const id="00000000-0000-4000-8000-000000000001";
    const room="00000000-0000-4000-8000-000000000010"; const token="A".repeat(43);
    const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),or:vi.fn().mockReturnThis(),
      order:vi.fn().mockResolvedValue({data:[],error:null}),maybeSingle:vi.fn().mockResolvedValue({data:{token_hash:hashSessionToken(token),revoked_at:null},error:null})};
    const from=vi.fn().mockReturnValue(query); const db={from} as unknown as ServerDatabaseClient;
    await getEvidenceForPlayer(db,{playerId:id,roomId:room,token});
    expect(from.mock.calls.map(call=>call[0])).toEqual(["player_sessions","evidence"]);
    expect(query.eq).toHaveBeenCalledWith("room_id",room);
    expect(query.or).toHaveBeenCalledWith(`owner_player_id.eq.${id},visibility.in.(shared,public)`);
    query.maybeSingle.mockResolvedValueOnce({data:null,error:null}); from.mockClear();
    await expect(getEvidenceForPlayer(db,{playerId:id,roomId:room,token})).rejects.toMatchObject({code:"INVALID_SESSION"});
    expect(from).toHaveBeenCalledTimes(1);
  });
  it("uses one atomic RPC and forwards stale-write failure",async()=>{
    const h=harness(); const context=h.context(); const next=accepted(startGame(h.state,context));
    const rpc=vi.fn().mockResolvedValue({data:1,error:null}); const db={rpc} as unknown as ServerDatabaseClient;
    await expect(persistGameStateWithVersion(db,next,{expectedVersion:0,commandId:context.commandId,occurredAt:context.occurredAt})).resolves.toBe(1);
    expect(rpc).toHaveBeenCalledTimes(1); expect(rpc.mock.calls[0][1]).toMatchObject({p_expected_version:0,p_command_id:context.commandId});
    rpc.mockResolvedValueOnce({data:null,error:{code:"40001",message:"VERSION_CONFLICT"}});
    await expect(persistGameStateWithVersion(db,next,{expectedVersion:0,commandId:context.commandId,occurredAt:context.occurredAt})).rejects.toMatchObject({code:"VERSION_CONFLICT"});
  });
});
