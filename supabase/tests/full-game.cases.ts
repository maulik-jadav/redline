import { spawn } from "node:child_process";
import { fullStep } from "@/lib/game-server/full-game.test-support";
import type { EngineState } from "@/lib/game";
import { createHash } from "node:crypto";
import { describe,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createGame,startGame,advancePhase } from "@/lib/game";
import { toPersistenceSnapshot,fromPersistenceSnapshot } from "@/lib/supabase/mapping";
import { playMatch } from "@/lib/game-server/full-game.test-support";
import { room,ids,roles,members,time } from "@/lib/game-server/fixtures.test-support";
import { resultsPayload } from "@/lib/game-server/results";
export function registerFullGameTests(run:(sql:string)=>string) {
  const hash=(id:string)=>createHash("sha256").update(id).digest("hex");
  const json=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
  const initial=createGame({roomId:room,mode:"demo",roleAssignments:roles});const started=startGame(initial,{commandId:"start",occurredAt:time});if(!started.ok)throw new Error("fixture");
  const intro=advancePhase(started.state,{commandId:"briefing-complete",occurredAt:time});if(!intro.ok)throw new Error("fixture");
  const seed=`insert into public.rooms(id,code,scenario_id,mode,status) values('${room}','FULL','blackout','demo','waiting');
    ${members.map(member=>`insert into public.players(id,room_id,display_name,role,is_host,is_ready,briefing_acknowledged_at) values('${member.id}','${room}','${member.display_name}','${member.role}',${member.is_host},true,now());insert into public.player_sessions(room_id,player_id,token_hash) values('${room}','${member.id}','${hash(member.id)}');`).join("\n")}
    update public.rooms set host_player_id='${ids[0]}' where id='${room}';
    select public.persist_engine_snapshot('${room}',null,null,${json(toPersistenceSnapshot(initial,time))});
    select public.persist_engine_snapshot('${room}',0,'start',${json(toPersistenceSnapshot(started.state,time))});
    select public.persist_engine_snapshot('${room}',1,'briefing-complete',${json(toPersistenceSnapshot(intro.state,time))});`;
  const cleanup=()=>run(`begin;delete from public.votes where room_id='${room}';delete from public.proposals where room_id='${room}';delete from public.rooms where id='${room}';commit;`);
  describe("complete persisted BLACKOUT",()=>{
    it.each(["truth","concealment","failure"] as const)("persists complete %s match with canonical result and no duplicate effects",path=>{
      const commands:string[]=[];
      const expected=playMatch(path,(before,plan,actor)=>{commands.push(`select public.commit_gameplay('${room}','${actor}','${hash(actor)}',${before.version},'${plan.root}',${json(plan.states.map(value=>toPersistenceSnapshot(value,time)))});`);});
      try {
        run(`set role service_role;${seed}${commands.join("\n")}`);
        const output=run(`select public.load_engine_snapshot('${room}');`);const stored=fromPersistenceSnapshot(JSON.parse(output.trim()));
        expect(stored).toEqual(expected);expect(stored.status).toBe("completed");expect(stored.result?.personalObjectives).toHaveLength(4);expect(stored.timeline.filter(entry=>entry.type==="ending")).toHaveLength(1);
        const view=resultsPayload(stored,members,ids[0],"FULL");expect(view.teamScore).toBe(expected.result?.teamScore);expect(view.grade).toBe(expected.result?.grade);
        if(path==="truth")expect(view.truthExposed).toBe(true);if(path==="failure")expect(view.ending).toBe("grid_collapse");
        run(`set role service_role;select public.get_crisis_members('FULL','${ids[0]}','${hash(ids[0])}');`);
        // Print only public deterministic integration results, never credentials.
        console.info(`Full ${path}: ${view.ending}, score ${view.teamScore}, grade ${view.grade}`);
      }finally{cleanup();}
    });
    it.each(["ballot","expiry"] as const)("serializes simultaneous REDLINE %s requests without duplicate resolution",async kind=>{
      const commands:string[]=[];let open:EngineState|undefined;
      playMatch("truth",(before,plan,actor)=>{if(before.phase==="redline_protocol"){open??=before;return;}if(open)return;commands.push(`select public.commit_gameplay('${room}','${actor}','${hash(actor)}',${before.version},'${plan.root}',${json(plan.states.map(value=>toPersistenceSnapshot(value,time)))});`);});
      const commit=(before:EngineState,plan:ReturnType<typeof fullStep>,actor:string)=>`set role service_role;select public.commit_gameplay('${room}','${actor}','${hash(actor)}',${before.version},'${plan.root}',${json(plan.states.map(value=>toPersistenceSnapshot(value,time)))});`;
      const load=()=>fromPersistenceSnapshot(JSON.parse(run(`select public.load_engine_snapshot('${room}');`).trim()));
      try {
        run(`set role service_role;${seed}${commands.join("\n")}`);
        const state=open!;const intentions=ids.slice(0,2).map(actor=>({actor,plan:fullStep(state,kind==="ballot"?{type:"redline",choice:"manual_takeover"}:{type:"timeout"},actor)}));
        const execute=(sql:string)=>new Promise<void>((resolve,reject)=>{const child=spawn("psql",["--no-psqlrc","--dbname",process.env.REDLINE_TEST_DATABASE_URL!,"-v","ON_ERROR_STOP=1","-At"],{stdio:["pipe","ignore","ignore"]});child.on("error",reject);child.on("exit",code=>code===0?resolve():reject(new Error("Concurrent command rejected")));child.stdin.end(sql);});
        const outcomes=await Promise.allSettled(intentions.map(({actor,plan})=>execute(commit(state,plan,actor))));
        expect(outcomes.filter(value=>value.status==="fulfilled")).toHaveLength(1);expect(outcomes.filter(value=>value.status==="rejected")).toHaveLength(1);
        let current=load();expect(current.version).toBe(state.version+1);
        if(kind==="ballot"){
          const winner=outcomes.findIndex(value=>value.status==="fulfilled");run(commit(state,intentions[winner].plan,intentions[winner].actor));expect(load().version).toBe(current.version);
          const loser=intentions[1-winner].actor;let plan=fullStep(current,{type:"redline",choice:"manual_takeover"},loser);run(commit(current,plan,loser));current=load();
          plan=fullStep(current,{type:"redline",choice:"manual_takeover"},ids[2]);run(commit(current,plan,ids[2]));current=load();expect(current.redlineResolution).toBe("manual_takeover");
        }else expect(current.redlineResolution).toBe("deadlock");
        expect(current.status).toBe("completed");expect(current.timeline.filter(entry=>entry.type==="ending")).toHaveLength(1);expect(current.resolvedRounds.filter(value=>value===5)).toHaveLength(1);
      }finally{cleanup();}
    });
    it("bounds optional AI calls under a room lock and denies browser metadata access",()=>{
      try {
        const output=run(`set role service_role;${seed}${Array.from({length:11},(_,i)=>`select public.reserve_game_ai('${room}','call-${i}');`).join("\n")}select public.reserve_game_ai('${room}','call-0');`);
        expect(output.split("\n").filter(line=>line==="t")).toHaveLength(10);expect(output.split("\n").filter(line=>line==="f")).toHaveLength(2);
        for(const role of ["anon","authenticated"])run(`begin;set local role ${role};do $test$ begin begin perform 1 from public.game_ai;raise exception 'EXPECTED_DENIAL';exception when insufficient_privilege then null;end;begin perform public.commit_gameplay('${room}','${ids[0]}','${hash(ids[0])}',0,'bad','[]');raise exception 'EXPECTED_DENIAL';exception when insufficient_privilege then null;end;end $test$;rollback;`);
      }finally{cleanup();}
    });
  });
}
