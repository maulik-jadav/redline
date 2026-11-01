import { beforeEach,describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
const mocks=vi.hoisted(()=>({member:vi.fn(),notify:vi.fn()}));
vi.mock("@/lib/briefing/http",()=>({briefingMember:mocks.member}));
vi.mock("@/lib/realtime/server",()=>({notifyLobbyChanged:mocks.notify}));
import { GET,POST } from "@/app/api/crisis/[roomCode]/route";
import { hashSessionToken } from "@/lib/supabase/sessions";
import { toPersistenceSnapshot } from "@/lib/supabase/mapping";
import { BLACKOUT_SCENARIO } from "@/data/blackout";
import { BLACKOUT_ROLES } from "@/data/blackout/roles";
import { PLAYER_ROLES } from "@/types";
import { discussion,ids,members,room,time } from "./fixtures.test-support";
import { opaqueRef } from "./snapshots";
let state=discussion();let credential={roomId:room,playerId:ids[0],token:"A".repeat(43)};
const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn()};
const rpc=vi.fn();const db={from:()=>query,rpc};
beforeEach(()=>{
  vi.clearAllMocks();state=discussion();credential={roomId:room,playerId:ids[0],token:"A".repeat(43)};
  query.maybeSingle.mockImplementation(async()=>({data:{token_hash:hashSessionToken(credential.token),revoked_at:null},error:null}));
  rpc.mockImplementation(async(name:string,args:{p_code?:string})=>name==="get_crisis_members"?args.p_code==="TEST"?{data:members,error:null}:{data:null,error:{message:"INVALID_SESSION"}}:name==="load_engine_snapshot"?{data:toPersistenceSnapshot(state,time),error:null}:{data:null,error:null});
  mocks.member.mockImplementation(async(params:Promise<{roomCode:string}>)=>({db,code:(await params).roomCode,credential}));
});
const context=(code="TEST")=>({params:Promise.resolve({roomCode:code})});
const request=(body:unknown,origin="http://localhost")=>new Request("http://localhost/api/crisis/TEST",{method:"POST",headers:{origin,"Content-Type":"application/json"},body:JSON.stringify(body)});
describe("actual gameplay HTTP boundary",()=>{
  it.each(PLAYER_ROLES)("delivers only %s authorized intel with no hidden risk or dossier",async(role)=>{
    credential.playerId=state.roleAssignments[role];const response=await GET(new Request("http://localhost/api/crisis/TEST"),context());const body=await response.json();const json=JSON.stringify(body);
    expect(response.status).toBe(200);expect(response.headers.get("Cache-Control")).toBe("no-store");expect(body.data.ownIntel[0].text).toBe(BLACKOUT_SCENARIO.rounds[1].privateIntel[role].text);
    for(const other of PLAYER_ROLES.filter(value=>value!==role))expect(json).not.toContain(JSON.stringify(BLACKOUT_SCENARIO.rounds[1].privateIntel[other].text).slice(1,-1));
    for(const definition of Object.values(BLACKOUT_ROLES))expect(json).not.toContain(definition.secret);
    expect(json).not.toMatch(/cascadeRisk|cascade_risk|hiddenMetrics|roleAssignments|token_hash|processed_commands/);
  });
  it("rejects a visitor without a room cookie before loading the engine",async()=>{
    mocks.member.mockRejectedValue({code:"INVALID_SESSION"});const response=await GET(new Request("http://localhost/api/crisis/TEST"),context());expect(response.status).toBe(401);expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects a wrong-room session without delivering gameplay",async()=>{
    const response=await GET(new Request("http://localhost/api/crisis/OTHER"),context("OTHER"));expect(response.status).toBe(401);expect(await response.text()).not.toContain("ownIntel");
  });
  it("rejects revoked session before snapshot lookup",async()=>{
    query.maybeSingle.mockResolvedValue({data:{token_hash:hashSessionToken(credential.token),revoked_at:time},error:null});const response=await GET(new Request("http://localhost/api/crisis/TEST"),context());expect(response.status).toBe(401);expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects missing role and an inappropriate phase",async()=>{
    state.roleAssignments.engineer="someone-else";
    expect((await GET(new Request("http://localhost/api/crisis/TEST"),context())).status).toBe(401);
    state=discussion();state.phase="briefing";
    expect((await GET(new Request("http://localhost/api/crisis/TEST"),context())).status).toBe(409);
  });
  it("rejects stale version, actor injection and cross-origin commands",async()=>{
    const commandId=ids[0];
    const stale=await POST(request({commandId,expectedVersion:0,intention:{type:"propose",title:"Test",action:"Act",reason:"Why"}}),context());expect((await stale.json()).code).toBe("STATE_CHANGED");
    expect((await POST(request({commandId,expectedVersion:state.version,intention:{type:"vote",choice:"approve",playerId:ids[1]}}),context())).status).toBe(409);
    expect((await POST(request({commandId,expectedVersion:state.version,intention:{type:"begin"}},"https://evil.example"),context())).status).toBe(409);
    expect(rpc.mock.calls.some(([name])=>name==="commit_round_one")).toBe(false);
  });
  it("commits server-derived actor state and sends only game invalidation",async()=>{
    const response=await POST(request({commandId:ids[0],expectedVersion:state.version,intention:{type:"share",ref:opaqueRef(state.privateIntel[0].id)}}),context());
    expect(await response.json()).toEqual({ok:true,data:null});expect(mocks.notify).toHaveBeenCalledWith(db,"TEST","game_changed");
    const commit=rpc.mock.calls.find(([name])=>name==="commit_round_one")!;
    expect(commit[1]).toMatchObject({p_player_id:credential.playerId,p_token_hash:hashSessionToken(credential.token)});expect(commit[1].p_steps).toHaveLength(1);
  });
});
