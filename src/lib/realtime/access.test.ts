import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({get:vi.fn(),member:vi.fn(),database:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:mocks.get})}));
vi.mock("@/lib/rooms/service",()=>({getLobbyForMember:mocks.member}));
vi.mock("@/lib/supabase/server",()=>({createServerSupabaseClient:mocks.database}));
import { POST } from "@/app/api/lobby/[roomCode]/realtime/route";
import { encodeCredential } from "@/lib/rooms/identity";

const credential={roomId:"00000000-0000-4000-8000-000000000010",playerId:"00000000-0000-4000-8000-000000000001",token:"A".repeat(43)};
const request=(origin="http://localhost")=>new Request("http://localhost/api/lobby/7XK9/realtime",{method:"POST",headers:{origin}});
const context=()=>({params:Promise.resolve({roomCode:"7XK9"})});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("SUPABASE_REALTIME_JWT_SECRET","s".repeat(40));mocks.database.mockReturnValue({});});
afterEach(()=>vi.unstubAllEnvs());
describe("cookie-authenticated Realtime access endpoint",()=>{
  it("does not issue capabilities to a visitor knowing only the room code",async()=>{
    mocks.get.mockReturnValue(undefined);const response=await POST(request(),context());
    expect(response.status).toBe(401);expect(mocks.member).not.toHaveBeenCalled();
  });
  it("rejects revoked/wrong-room sessions before issuing access",async()=>{
    mocks.get.mockReturnValue({value:encodeCredential(credential)});mocks.member.mockRejectedValue({code:"INVALID_SESSION"});
    const response=await POST(request(),context()); expect(response.status).toBe(401);expect(await response.text()).not.toContain("token");
  });
  it("derives identity only from the verified member and never returns the cookie credential",async()=>{
    mocks.get.mockReturnValue({value:encodeCredential(credential)});
    mocks.member.mockResolvedValue({code:"7XK9",selfPlayerId:credential.playerId});
    const response=await POST(request(),context());const result=await response.json();
    expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.member).toHaveBeenCalledWith({},"7XK9",credential);expect(result.data.playerId).toBe(credential.playerId);
    expect(JSON.stringify(result)).not.toContain(credential.token);
  });
  it("rejects cross-origin issuance without checking or exposing membership",async()=>{
    const response=await POST(request("https://evil.example"),context());expect(response.status).toBe(400);expect(mocks.member).not.toHaveBeenCalled();
  });
});
