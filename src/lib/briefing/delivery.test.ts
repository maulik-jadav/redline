import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({member:vi.fn(),context:vi.fn(),ack:vi.fn(),start:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/briefing/http",()=>({briefingMember:mocks.member}));
vi.mock("@/lib/briefing/service",async(importOriginal)=>({...await importOriginal<object>(),getBriefingContext:mocks.context,acknowledgeBriefing:mocks.ack,initiateCrisis:mocks.start}));
vi.mock("@/lib/realtime/server",()=>({notifyLobbyChanged:mocks.notify}));
vi.mock("@/components/briefing/classified-briefing",()=>({ClassifiedBriefing:()=>null}));
import BriefingPage from "@/app/briefing/[roomCode]/page";
import { GET, POST } from "@/app/api/briefing/[roomCode]/route";
import { POST as START } from "@/app/api/lobby/[roomCode]/start/route";
import { BLACKOUT_ROLES } from "@/data/blackout/roles";
import { PLAYER_ROLES } from "@/types";
beforeEach(()=>{vi.clearAllMocks();mocks.member.mockResolvedValue({db:{},code:"TEST",credential:{}});});
const status={code:"TEST",status:"active",phase:"briefing",selfPlayerId:"self",acknowledgedCount:0,allAcknowledged:false,operators:[]};
describe("actual server delivery boundaries",()=>{
  it.each(PLAYER_ROLES)("SSR props contain only the authorized %s secret",async(role)=>{
    mocks.context.mockResolvedValue({status,self:{role,displayName:"Operator",uses:BLACKOUT_ROLES[role].ability.maxUses}});
    const element=await BriefingPage({params:Promise.resolve({roomCode:"TEST"})});
    const payload=JSON.stringify(element.props,(key,value)=>key==="type"||key==="_owner"?undefined:value);
    expect(payload).toContain(BLACKOUT_ROLES[role].secret);
    for(const other of PLAYER_ROLES.filter(value=>value!==role))expect(payload).not.toContain(BLACKOUT_ROLES[other].secret);
  });
  it("status HTTP response excludes even the current role and private data",async()=>{
    mocks.context.mockResolvedValue({status,self:{role:"engineer",displayName:"Operator",uses:3}});
    const response=await GET(new Request("http://localhost/api/briefing/TEST"),{params:Promise.resolve({roomCode:"TEST"})});
    expect(await response.json()).toEqual({ok:true,data:status});expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each(["INVALID_SESSION","ROOM_NOT_STARTED","BRIEFING_UNAVAILABLE"])("denies SSR secret delivery on %s",async(code)=>{
    mocks.context.mockRejectedValue({code});const element=await BriefingPage({params:Promise.resolve({roomCode:"TEST"})});
    const payload=JSON.stringify(element.props,(key,value)=>key==="type"||key==="_owner"?undefined:value);
    for(const role of PLAYER_ROLES)expect(payload).not.toContain(BLACKOUT_ROLES[role].secret);
    expect(payload).toContain("ACCESS DENIED");
  });
  it("no cookie fails before any private lookup",async()=>{
    mocks.member.mockRejectedValue({code:"INVALID_SESSION"});
    await BriefingPage({params:Promise.resolve({roomCode:"TEST"})});expect(mocks.context).not.toHaveBeenCalled();
  });
  it("acknowledgement emits only room invalidation after the session-bound mutation",async()=>{
    const request=new Request("http://localhost/api/briefing/TEST",{method:"POST",headers:{origin:"http://localhost","Content-Type":"application/json"},body:JSON.stringify({action:"acknowledge"})});
    const response=await POST(request,{params:Promise.resolve({roomCode:"TEST"})});expect(response.status).toBe(200);
    expect(mocks.ack).toHaveBeenCalledWith({},"TEST",{});expect(mocks.notify).toHaveBeenCalledWith({},"TEST");
    expect(mocks.ack.mock.invocationCallOrder[0]).toBeLessThan(mocks.notify.mock.invocationCallOrder[0]);
  });
  it("does not allow an acknowledgement to name another player",async()=>{
    const response=await POST(new Request("http://localhost/api/briefing/TEST",{method:"POST",headers:{origin:"http://localhost","Content-Type":"application/json"},body:JSON.stringify({action:"acknowledge",playerId:"someone-else"})}),{params:Promise.resolve({roomCode:"TEST"})});
    expect(response.status).toBe(400);expect(mocks.ack).not.toHaveBeenCalled();expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("start emits room invalidation without private role or engine payload",async()=>{
    const commandId="00000000-0000-4000-8000-000000000099";
    const response=await START(new Request("http://localhost/api/lobby/TEST/start",{method:"POST",headers:{origin:"http://localhost","Content-Type":"application/json"},body:JSON.stringify({commandId})}),{params:Promise.resolve({roomCode:"TEST"})});
    expect(mocks.start).toHaveBeenCalledWith({},"TEST",{},commandId);expect(mocks.notify).toHaveBeenCalledWith({},"TEST");expect(await response.json()).toEqual({ok:true,data:null});
  });
});
