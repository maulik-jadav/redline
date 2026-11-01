import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createGame,startGame,advancePhase } from "@/lib/game";
import type { EngineState } from "@/lib/game";
import { toPersistenceSnapshot,fromPersistenceSnapshot } from "@/lib/supabase/mapping";
import { planCommand } from "@/lib/game-server/commands";
import type { Intention } from "@/lib/game-server/commands";
import { crisisSnapshot,opaqueRef } from "@/lib/game-server/snapshots";
import { room,roles,ids,members,time } from "@/lib/game-server/fixtures.test-support";
const literal=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
const hash=(id:string)=>createHash("sha256").update(id).digest("hex");
const initial=createGame({roomId:room,mode:"demo",roleAssignments:roles});
const start=startGame(initial,{commandId:"start",occurredAt:time});if(!start.ok)throw new Error("fixture");
const intro=advancePhase(start.state,{commandId:"briefing-complete",occurredAt:time});if(!intro.ok)throw new Error("fixture");
const rawSeed=`insert into public.rooms(id,code,scenario_id,mode,status) values('${room}','R109','blackout','demo','waiting');
  ${members.map(member=>`insert into public.players(id,room_id,display_name,role,is_host,is_ready,briefing_acknowledged_at) values('${member.id}','${room}','${member.display_name}','${member.role}',${member.is_host},true,now());insert into public.player_sessions(room_id,player_id,token_hash) values('${room}','${member.id}','${hash(member.id)}');`).join("\n")}
  update public.rooms set host_player_id='${ids[0]}' where id='${room}';`;
const storage=(state:EngineState,expected:number|null,command:string|null)=>`select public.persist_engine_snapshot('${room}',${expected===null?"null":expected},${command?`'${command}'`:"null"},${literal(toPersistenceSnapshot(state,time))});`;
const seed=rawSeed+storage(initial,null,null)+storage(start.state,0,"start")+storage(intro.state,1,"briefing-complete");
let number=0;
function plan(state:EngineState,intention:Intention,actor=ids[0],at=time) {return planCommand(state,{playerId:actor,isHost:actor===ids[0]},{commandId:`00000000-0000-4000-8000-${String(50000+number++).padStart(12,"0")}`,expectedVersion:state.version,intention},at);}
function commit(state:EngineState,steps:ReturnType<typeof plan>,actor=ids[0]) {return `select public.commit_round_one('${room}','${actor}','${hash(actor)}',${state.version},'${steps.root}',${literal(steps.states.map(value=>toPersistenceSnapshot(value,time)))});`;}
const fails=(statement:string,message:string)=>`do $test$ declare caught boolean=false;begin begin ${statement.trim().replace(/;$/,"").replace(/^select /,"perform ")};exception when others then if sqlerrm<>'${message}' then raise;end if;caught=true;end;if not caught then raise exception 'EXPECTED_FAILURE';end if;end $test$;`;
export function registerRoundOneTests(run:(sql:string)=>string,url:string|undefined) {
  const load=()=>fromPersistenceSnapshot(JSON.parse(run(`select public.load_engine_snapshot('${room}');`).split("\n").find(line=>line.startsWith('{"'))!));
  const write=(intention:Intention,actor=ids[0],at=time)=>{const state=load();const steps=plan(state,intention,actor,at);run(`set role service_role;${commit(state,steps,actor)}`);return load();};
  const cleanup=()=>run(`begin;delete from public.votes where room_id='${room}';delete from public.proposals where room_id='${room}';delete from public.rooms where id='${room}';commit;`);
  const begin=()=>{run(`set role service_role;${seed}`);let state=write({type:"begin"});state=write({type:"timeout"},ids[0],state.phaseEndsAt!);return state;};
  const voting=()=>{let state=begin();state=write({type:"canonical",responseId:"r1_reduce_sector_7_load"});return write({type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])});};
  const race=async(statements:string[])=>Promise.allSettled(statements.map(statement=>promisify(execFile)("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-c",`set role service_role;${statement}`])));
  describe("persisted Round 1 command boundary",()=>{
    it("plays a complete persisted four-player round with isolated intel, sharing, four votes and exact effects",()=>{
      try {
        let state=begin();
        for(const member of members){const data=crisisSnapshot(state,members,member.id,"R109",time);expect(data.ownIntel).toHaveLength(1);expect(JSON.stringify(data)).not.toMatch(/cascadeRisk|hiddenMetrics/);}
        state=write({type:"share",ref:opaqueRef(state.privateIntel.find(value=>value.ownerPlayerId===ids[0])!.id)});
        expect(crisisSnapshot(state,members,ids[1],"R109",time).sharedIntel).toHaveLength(1);
        state=write({type:"canonical",responseId:"r1_reduce_sector_7_load"});state=write({type:"select",ref:opaqueRef(Object.keys(state.proposals)[0])});
        for(let index=0;index<4;index++)state=write({type:"vote",choice:index===2?"reject":"approve"},ids[index]);
        expect(state.metrics).toEqual({grid:76,safety:84,economy:70,trust:69});expect(state.hiddenMetrics.cascadeRisk).toBe(14);
        expect(state.map.sectors.sector_7).toBe("warning");expect(state.round).toBe(1);expect(state.phase).toBe("consequence");expect(state.resolvedRounds).toEqual([1]);
        expect(state.timeline.filter(value=>value.type==="decision_executed")).toHaveLength(1);
        const dto=crisisSnapshot(state,members,ids[0],"R109",state.phaseEndsAt!);expect(dto.roundComplete).toBe(true);expect(dto.operators.every(value=>value.vote!==null)).toBe(true);
      }finally{cleanup();}
    });
    it("commits simultaneous Round 1 starts once, including all private intel and event projections",async()=>{
      run(`set role service_role;${seed}`);
      try {const state=load();const plans=[ids[0],ids[1]].map(actor=>commit(state,plan(state,{type:"begin"},actor),actor));const results=await race(plans);
        expect(results.every(result=>result.status==="fulfilled")).toBe(true);const stored=load();expect(stored.version).toBe(3);expect(stored.events).toHaveLength(1);expect(stored.privateIntel).toHaveLength(4);
      }finally{cleanup();}
    });
    it("serializes host selection against Mayor Emergency Order without consuming the losing action",async()=>{
      try {let state=begin();state=write({type:"canonical",responseId:"r1_reduce_sector_7_load"});const ref=opaqueRef(Object.keys(state.proposals)[0]);
        const results=await race([commit(state,plan(state,{type:"select",ref})),commit(state,plan(state,{type:"emergency",ref},ids[1]),ids[1])]);
        expect(results.filter(value=>value.status==="fulfilled")).toHaveLength(1);const stored=load();expect(stored.phase).toBe("voting");expect(stored.timeline.filter(value=>value.type==="proposal_selected")).toHaveLength(1);
        expect(stored.abilities.emergency_order.remainingUses).toBe(results[1].status==="fulfilled"?0:1);
      }finally{cleanup();}
    });
    it("serializes third approval against timeout resolution with exactly one consequence",async()=>{
      try {let state=voting();state=write({type:"vote",choice:"approve"},ids[0]);state=write({type:"vote",choice:"approve"},ids[1]);
        const results=await race([commit(state,plan(state,{type:"vote",choice:"approve"},ids[2]),ids[2]),commit(state,plan(state,{type:"timeout"},ids[3],state.phaseEndsAt!),ids[3])]);
        expect(results.filter(value=>value.status==="fulfilled")).toHaveLength(1);const stored=load();expect(stored.resolvedRounds).toEqual([1]);expect(stored.timeline.filter(value=>value.type==="vote_outcome")).toHaveLength(1);
        expect(stored.metrics.grid).toBe(results[0].status==="fulfilled"?76:70);
      }finally{cleanup();}
    });
    it("serializes multiple expired-phase requests and rejects a stale writer",async()=>{
      try {const state=begin();const a=plan(state,{type:"timeout"},ids[0],state.phaseEndsAt!),b=plan(state,{type:"timeout"},ids[1],state.phaseEndsAt!);
        const results=await race([commit(state,a),commit(state,b,ids[1])]);expect(results.filter(value=>value.status==="fulfilled")).toHaveLength(1);
        expect(load().phase).toBe("response_selection");expect(load().version).toBe(state.version+1);
      }finally{cleanup();}
    });
    it("rolls back the vote, reward, ledger and version when the second engine step fails",()=>{
      try {let state=voting();state=write({type:"vote",choice:"approve"},ids[0]);state=write({type:"vote",choice:"approve"},ids[1]);
        const before=state;const steps=plan(state,{type:"vote",choice:"approve"},ids[2]);const snapshots=steps.states.map(value=>toPersistenceSnapshot(value,time));snapshots[1].player_abilities[0].uses_remaining=-1;
        run(`set role service_role;do $test$ begin begin perform public.commit_round_one('${room}','${ids[2]}','${hash(ids[2])}',${state.version},'${steps.root}',${literal(snapshots)});raise exception 'EXPECTED_FAILURE';exception when check_violation then null;end;end $test$;`);
        expect(load()).toEqual(before);
      }finally{cleanup();}
    });
    it("replays an identical sharing command without duplicate timeline or collaboration",()=>{
      try {const state=begin();const steps=plan(state,{type:"share",ref:opaqueRef(state.privateIntel[0].id)});run(`set role service_role;${commit(state,steps)}`);const first=load();run(`set role service_role;${commit(state,steps)}`);expect(load()).toEqual(first);
      }finally{cleanup();}
    });
    it("requires an active acknowledged membership and rejects wrong/revoked/cross-room identities",()=>{
      try {begin();run(`set role service_role;
        ${fails(`select public.get_crisis_members('R109','${ids[0]}','${hash(ids[1])}')`,"INVALID_SESSION")}
        ${fails(`select public.get_crisis_members('R109','00000000-0000-4000-8000-000000099999','${hash(ids[0])}')`,"INVALID_SESSION")}
        update public.player_sessions set revoked_at=now() where player_id='${ids[0]}';
        ${fails(`select public.get_crisis_members('R109','${ids[0]}','${hash(ids[0])}')`,"INVALID_SESSION")}
        ${fails(`select public.commit_round_one('${room}','${ids[0]}','${hash(ids[0])}',4,'test','[]')`,"INVALID_SESSION")}`);
      }finally{cleanup();}
    });
    it("rejects left, unassigned and unacknowledged operators without exposing a snapshot",()=>{
      for(const change of [`left_at=now()`,`role=null`,`briefing_acknowledged_at=null`])run(`begin;set local role service_role;${rawSeed}update public.players set ${change} where id='${ids[0]}';update public.rooms set status='active' where id='${room}';${fails(`select public.get_crisis_members('R109','${ids[0]}','${hash(ids[0])}')`,"INVALID_SESSION")}rollback;`);
    });
    it("blocks browser RPC execution and a server projection attempting Round 2",()=>{
      for(const role of ["anon","authenticated"])run(`begin;set local role ${role};do $test$ begin begin perform public.get_crisis_members('R109','${ids[0]}','${hash(ids[0])}');raise exception 'EXPECTED_DENIAL';exception when insufficient_privilege then null;end;begin perform public.commit_round_one('${room}','${ids[0]}','${hash(ids[0])}',0,'test','[]');raise exception 'EXPECTED_DENIAL';exception when insufficient_privilege then null;end;end $test$;rollback;`);
      try {const state=begin();const steps=plan(state,{type:"canonical",responseId:"r1_reduce_sector_7_load"});const snapshots=steps.states.map(value=>toPersistenceSnapshot(value,time));snapshots[0].game_state.round=2;
        run(`set role service_role;${fails(`select public.commit_round_one('${room}','${ids[0]}','${hash(ids[0])}',${state.version},'${steps.root}',${literal(snapshots)})`,"INVALID_COMMAND")}`);
        expect(load()).toEqual(state);
      }finally{cleanup();}
    });
  });
}
