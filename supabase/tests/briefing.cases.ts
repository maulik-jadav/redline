import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createGame, startGame, advancePhase } from "@/lib/game";
import { toPersistenceSnapshot } from "@/lib/supabase/mapping";
const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const room=uuid(900);const ids=[901,902,903,904].map(uuid);const hash=(id=ids[0])=>createHash("sha256").update(id).digest("hex");const time="2042-01-01T00:00:00.000Z";
const command="start-briefing-test";
const initial=createGame({roomId:room,mode:"demo",roleAssignments:{engineer:ids[0],mayor:ids[1],executive:ids[2],journalist:ids[3]}});
const started=startGame(initial,{commandId:command,occurredAt:time});if(!started.ok)throw new Error("Fixture");
const completionCommand=`briefing-complete:${room}`;
const completed=advancePhase(started.state,{commandId:completionCommand,occurredAt:time});if(!completed.ok)throw new Error("Fixture");
const literal=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
const first=toPersistenceSnapshot(initial,time),next=toPersistenceSnapshot(started.state,time),done=toPersistenceSnapshot(completed.state,time);
const seed=`insert into public.rooms(id,code,scenario_id,mode,status,host_player_id) values('${room}','BR08','blackout','demo','waiting',null);
  ${ids.map((id,i)=>`insert into public.players(id,room_id,display_name,is_host,is_ready) values('${id}','${room}','Operator${i}',${i===0},true); insert into public.player_sessions(room_id,player_id,token_hash) values('${room}','${id}','${hash(id)}');`).join("\n")}
  update public.rooms set host_player_id='${ids[0]}' where id='${room}';`;
const start=(player=ids[0],snapshot:unknown=next)=>`select public.initiate_crisis('${room}','${player}','${hash(player)}','${command}',${literal(first)},${literal(snapshot)});`;
const ack=(id:string)=>`select public.acknowledge_briefing('${room}','${id}','${hash(id)}',1,${literal(done)},'${completionCommand}');`;
const check=(condition:string)=>`do $$ begin if not (${condition}) then raise exception 'ASSERTION_FAILED'; end if; end $$;`;
const fails=(sql:string,message:string)=>`do $test$ declare caught boolean=false; begin begin ${sql.trim().replace(/;$/,"").replace(/^select /,"perform ")}; exception when others then if sqlerrm<>'${message}' then raise; end if; caught=true; end; if not caught then raise exception 'EXPECTED_FAILURE'; end if; end $test$;`;
export function registerBriefingTests(run:(sql:string)=>string,url:string|undefined) {
  describe("atomic crisis initiation and private briefing",()=>{
    it("persists four roles, abilities, active briefing, timeline and command atomically",()=>{
      run(`begin;set local role service_role;${seed}${start()}
        ${check(`(select status='active' from public.rooms where id='${room}')`)}
        ${check(`(select count(distinct role) from public.players where room_id='${room}')=4`)}
        ${check(`(select phase='briefing' and version=1 and round is null from public.game_states where room_id='${room}')`)}
        ${check(`(select sum(uses_remaining) from public.player_abilities where room_id='${room}')=7`)}
        ${check(`(select count(*) from public.timeline where room_id='${room}' and type='game_start')=1`)}
        ${check(`(select count(*) from public.processed_commands where room_id='${room}')=1`)}rollback;`);
    });
    it("rejects non-host, incomplete and unready rosters",()=>{
      run(`begin;set local role service_role;${seed}
        ${fails(start(ids[1]),"NOT_HOST")}
        update public.players set is_ready=false where id='${ids[1]}';${fails(start(),"PLAYERS_NOT_READY")}
        update public.players set is_ready=true,left_at=now() where id='${ids[1]}';${fails(start(),"ROOM_NOT_FULL")}rollback;`);
    });
    it("rolls back role assignment, initial state, abilities and command if the start projection fails",()=>{
      const invalid=structuredClone(next);invalid.player_abilities[0].uses_remaining=-1;
      run(`begin;set local role service_role;${seed}
        do $test$ begin begin ${start(ids[0],invalid).replace(/^select /,"perform ")} raise exception 'EXPECTED_FAILURE';exception when check_violation then null;end;end $test$;
        ${check(`(select status='waiting' from public.rooms where id='${room}')`)}
        ${check(`(select count(*) from public.players where room_id='${room}' and role is not null)=0`)}
        ${["game_states","player_abilities","processed_commands","timeline"].map(table=>check(`(select count(*) from public.${table} where room_id='${room}')=0`)).join("\n")}rollback;`);
    });
    it("rejects duplicate initiation and preserves immutable roles and active membership",()=>{
      run(`begin;set local role service_role;${seed}${start()}${fails(start(),"ROOM_ALREADY_STARTED")}
        ${fails(`update public.players set role=null where id='${ids[0]}'`,"ROLE_IMMUTABLE")}
        ${fails(`select public.update_lobby_member('${room}','${ids[0]}','${hash()}','leave',null)`,"CRISIS_ACTIVE")}
        ${fails(`update public.rooms set status='waiting' where id='${room}'`,"ROOM_ALREADY_STARTED")}
        ${check(`(select count(*) from public.processed_commands where room_id='${room}')=1`)}rollback;`);
    });
    it("returns only current role in private context and no team role mapping in status",()=>{
      const output=run(`begin;set local role service_role;${seed}${start()}select public.get_briefing_context('BR08','${ids[0]}','${hash()}');rollback;`);
      const data=JSON.parse(output.split("\n").find(line=>line.includes('"acknowledgedCount"'))!);
      expect(data.self).toEqual({role:"engineer",displayName:"Operator0",uses:3});
      expect(JSON.stringify(data.status)).not.toMatch(/engineer|mayor|executive|journalist|secret|ability/);
    });
    it("denies wrong/revoked/left/cross-room sessions and an unstarted room",()=>{
      run(`begin;set local role service_role;${seed}
        ${fails(`select public.get_briefing_context('BR08','${ids[0]}','${hash()}')`,"ROOM_NOT_STARTED")}${start()}
        ${fails(`select public.get_briefing_context('BR08','${ids[0]}','${"b".repeat(64)}')`,"INVALID_SESSION")}
        ${fails(`select public.get_briefing_context('BR08','${uuid(999)}','${hash()}')`,"INVALID_SESSION")}
        update public.player_sessions set revoked_at=now() where player_id='${ids[0]}';
        ${fails(`select public.get_briefing_context('BR08','${ids[0]}','${hash()}')`,"INVALID_SESSION")}rollback;`);
    });
    it("acknowledges only the credential's player and keeps repeated acknowledgements stable",()=>{
      run(`begin;set local role service_role;${seed}${start()}
        ${fails(`select public.acknowledge_briefing('${room}','${ids[1]}','${hash()}',1,${literal(done)},'${completionCommand}')`,"INVALID_SESSION")}
        ${ack(ids[0])}${ack(ids[0])}
        ${check(`(select count(*) from public.players where room_id='${room}' and briefing_acknowledged_at is not null)=1`)}
        ${check(`(select version=1 and phase='briefing' from public.game_states where room_id='${room}')`)}rollback;`);
    });
    it("four acknowledgements transition exactly once, with stable refresh and no secrets in timeline",()=>{
      const output=run(`begin;set local role service_role;${seed}${start()}${ids.map(ack).join("\n")}${ack(ids[3])}
        ${check(`(select version=2 and phase='mission_intro' and round is null from public.game_states where room_id='${room}')`)}
        ${check(`(select count(*) from public.timeline where room_id='${room}' and type='briefing_completed')=1`)}
        ${check(`(select count(*) from public.processed_commands where room_id='${room}')=2`)}
        select public.get_briefing_context('BR08','${ids[0]}','${hash()}');select public.get_briefing_context('BR08','${ids[0]}','${hash()}');rollback;`);
      const responses=output.split("\n").filter(line=>line.includes('"acknowledgedCount"')).map(line=>JSON.parse(line));
      expect(responses[0]).toEqual(responses[1]);expect(responses[0].status.allAcknowledged).toBe(true);
      expect(JSON.stringify(done.timeline)).not.toMatch(/secret|Maya|Marcus|Elena|Lena|7\.4/);
    });
    it("serializes concurrent final acknowledgements without duplicate completion",async()=>{
      run(`set role service_role;${seed}${start()}${ack(ids[0])}${ack(ids[1])}`);
      try {
        const execute=promisify(execFile);
        const results=await Promise.allSettled(ids.slice(2).map(id=>execute("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-c",`set role service_role;${ack(id)}`])));
        expect(results.every(result=>result.status==="fulfilled")).toBe(true);
        expect(run(`select phase||':'||version from public.game_states where room_id='${room}';`).trim()).toBe("mission_intro:2");
        expect(run(`select count(*) from public.timeline where room_id='${room}' and type='briefing_completed';`).trim()).toBe("1");
      }finally{run(`delete from public.rooms where id='${room}';`);}
    });
    it("denies browser execution of start, acknowledgement and private context RPCs",()=>{
      for(const role of ["anon","authenticated"])for(const statement of [
        `perform public.get_briefing_context('BR08','${ids[0]}','${hash()}');`,
        start().replace(/^select /,"perform "),ack(ids[0]).replace(/^select /,"perform "),
      ])run(`begin;set local role ${role};do $test$ begin begin
        ${statement}raise exception 'EXPECTED_DENIAL';exception when insufficient_privilege then null;end;end $test$;rollback;`);
    });
    it("denies left membership and a genuine other-room session",()=>{
      run(`begin;set local role service_role;${seed}
        update public.players set left_at=now() where id='${ids[0]}';
        ${fails(`select public.get_briefing_context('BR08','${ids[0]}','${hash()}')`,"INVALID_SESSION")}
        insert into public.rooms(id,code,scenario_id,mode,status) values('${uuid(950)}','OT08','blackout','demo','waiting');
        insert into public.players(id,room_id,display_name) values('${uuid(951)}','${uuid(950)}','Other');
        insert into public.player_sessions(room_id,player_id,token_hash) values('${uuid(950)}','${uuid(951)}','${hash(uuid(951))}');
        ${fails(`select public.get_briefing_context('BR08','${uuid(951)}','${hash(uuid(951))}')`,"INVALID_SESSION")}rollback;`);
    });
    it("denies briefing when a started storage record lacks the player's role",()=>{
      const record={...first.game_state,phase:"briefing",status:"active",version:1};
      run(`begin;set local role service_role;${seed}
        insert into public.game_states select * from jsonb_populate_record(null::public.game_states,${literal(record)});
        update public.rooms set status='active' where id='${room}';
        ${fails(`select public.get_briefing_context('BR08','${ids[0]}','${hash()}')`,"BRIEFING_UNAVAILABLE")}rollback;`);
    });
    it("rolls back the final acknowledgement if completion cannot be committed",()=>{
      run(`begin;set local role service_role;${seed}${start()}${ids.slice(0,3).map(ack).join("\n")}
        ${fails(`select public.acknowledge_briefing('${room}','${ids[3]}','${hash(ids[3])}',999,${literal(done)},'${completionCommand}')`,"INVALID_COMPLETION")}
        ${check(`(select count(*) from public.players where room_id='${room}' and briefing_acknowledged_at is not null)=3`)}
        ${check(`(select version=1 and phase='briefing' from public.game_states where room_id='${room}')`)}rollback;`);
    });
  });
}
