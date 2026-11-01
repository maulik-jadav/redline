import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { issueRealtimeGrant, notifyLobbyChanged } from "./server";
import type { ServerDatabaseClient } from "@/lib/supabase/server";
import type { LobbyView } from "@/types/lobby";

afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});
const lobby:LobbyView={code:"7XK9",mode:"demo",status:"waiting",selfPlayerId:"00000000-0000-4000-8000-000000000001",players:[]};
describe("server transport boundary",()=>{
  it("issues a signed five-minute room-bound capability without session secrets",()=>{
    vi.stubEnv("SUPABASE_REALTIME_JWT_SECRET","s".repeat(40));
    const grant=issueRealtimeGrant(lobby,1000); const [header,body,signature]=grant.token.split(".");
    expect(signature).toBe(createHmac("sha256","s".repeat(40)).update(`${header}.${body}`).digest("base64url"));
    expect(JSON.parse(Buffer.from(body,"base64url").toString())).toEqual({role:"authenticated",aud:"authenticated",sub:lobby.selfPlayerId,redline_room:"7XK9",redline_realtime:true,iat:1000,exp:1300});
    expect(grant).toMatchObject({topic:"redline:room:7XK9",playerId:lobby.selfPlayerId,expiresAt:1300});
  });
  it("fails closed when signing is not configured",()=>{
    vi.stubEnv("SUPABASE_REALTIME_JWT_SECRET",""); expect(()=>issueRealtimeGrant(lobby)).toThrow();
  });
  it("broadcasts only invalidation without subscribing and cleans up",async()=>{
    const channel={httpSend:vi.fn().mockResolvedValue({success:true}),subscribe:vi.fn()};
    const db={realtime:{setAuth:vi.fn().mockResolvedValue(undefined)},channel:vi.fn().mockReturnValue(channel),removeChannel:vi.fn().mockResolvedValue(undefined)};
    await notifyLobbyChanged(db as unknown as ServerDatabaseClient,"7XK9");
    expect(db.channel).toHaveBeenCalledWith("redline:room:7XK9",{config:{private:true}});
    expect(channel.httpSend).toHaveBeenCalledWith("lobby_changed",{type:"lobby_changed"},{timeout:1500});
    expect(channel.subscribe).not.toHaveBeenCalled(); expect(db.removeChannel).toHaveBeenCalledWith(channel);
  });
  it("keeps mutation success on notification failure and logs no infrastructure details",async()=>{
    const warn=vi.spyOn(console,"warn").mockImplementation(()=>{});
    const channel={httpSend:vi.fn().mockRejectedValue(new Error("secret provider error"))};
    const db={realtime:{setAuth:vi.fn().mockResolvedValue(undefined)},channel:()=>channel,removeChannel:vi.fn().mockResolvedValue(undefined)};
    await expect(notifyLobbyChanged(db as unknown as ServerDatabaseClient,"7XK9")).resolves.toBeUndefined();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret provider error"); expect(db.removeChannel).toHaveBeenCalledOnce();
  });
});
