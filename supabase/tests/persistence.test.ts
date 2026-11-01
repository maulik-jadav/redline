/** Optional real-Postgres tests. Use ONLY a disposable database named redline_test. */
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";
import { advancePhase, createCanonicalProposal, createGame, executeAbility, finalizeNormalVote,
  selectProposal, shareEvidence, startGame, submitNormalVote, submitRedlineSelection } from "@/lib/game";
import type { EngineResult, EngineState } from "@/lib/game";
import { fromPersistenceSnapshot, toPersistenceSnapshot } from "@/lib/supabase/mapping";
import type { PersistenceSnapshot } from "@/lib/supabase/database.types";
import { registerLobbyTests } from "./lobby.cases";
import { registerRealtimeTests } from "./realtime.cases";
import { registerBriefingTests } from "./briefing.cases";
import { registerRoundOneTests } from "./round-one.cases";
import { registerFullGameTests } from "./full-game.cases";

const url=process.env.REDLINE_TEST_DATABASE_URL;
const run=(sql:string)=>execFileSync("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-At"],{input:sql,encoding:"utf8"});
const literal=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
const room="00000000-0000-4000-8000-000000000010";
const roles={engineer:"00000000-0000-4000-8000-000000000001",mayor:"00000000-0000-4000-8000-000000000002",
  executive:"00000000-0000-4000-8000-000000000003",journalist:"00000000-0000-4000-8000-000000000004"};
const time="2042-03-01T00:00:00.000Z";
const initial=()=>createGame({roomId:room,mode:"standard",roleAssignments:roles});
const seed=`insert into public.rooms(id,code,scenario_id,mode,status) values('${room}','7XK9','blackout','standard','waiting');
  ${Object.entries(roles).map(([role,id])=>`insert into public.players(id,room_id,display_name,role) values('${id}','${room}','${role}','${role}');`).join("\n")}`;
const commit=(state:EngineState,expected:number|null,command:string|null)=>`select public.persist_engine_snapshot('${room}',${expected===null?"null":expected},${command===null?"null":`'${command}'`},${literal(toPersistenceSnapshot(state,time))});`;
const assertSql=(expression:string)=>`do $$ begin if not (${expression}) then raise exception 'ASSERTION_FAILED'; end if; end $$;`;
const raises=(sql:string,code:string)=>`do $test$ begin begin ${sql}; raise exception 'EXPECTED_FAILURE'; exception when sqlstate '${code}' then null; end; end $test$;`;

describe.skipIf(!url)("real Postgres persistence",()=>{
  registerLobbyTests(run,url);
  registerRealtimeTests(run);
  registerBriefingTests(run,url);
  registerRoundOneTests(run,url);
  registerFullGameTests(run);
  beforeAll(()=>{
    if(run("select current_database();").trim()!=="redline_test") throw new Error("Refusing to use a database not named redline_test.");
    // Plain Postgres has no managed Realtime schema. This disposable fixture tests
    // real RLS behavior, not the Realtime service or WebSocket implementation.
    run(`create schema realtime;
      create table realtime.messages(id bigint generated always as identity,extension text not null);
      alter table realtime.messages enable row level security;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
      grant usage on schema realtime to authenticated,anon;
      grant select,insert on realtime.messages to authenticated;
      grant usage on sequence realtime.messages_id_seq to authenticated;`);
    for(const migration of ["20261031000100_persistence_foundation.sql","20261031000200_atomic_engine_persistence.sql","20261031000300_lobby_sessions.sql","20261031000400_lobby_realtime.sql","20261031000500_crisis_briefing.sql","20261031000600_round_one_commands.sql","20261031000700_complete_game.sql"]) {
      execFileSync("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-1","-f",`supabase/migrations/${migration}`],{stdio:"pipe"});
    }
  });
  it("applies migrations and round-trips initial state through the real RPC",()=>{
    const output=run(`begin; ${seed} set local role service_role; ${commit(initial(),null,null)} select public.load_engine_snapshot('${room}'); rollback;`);
    const snapshot=JSON.parse(output.split("\n").find(line=>line.startsWith('{"'))!) as PersistenceSnapshot;
    expect(fromPersistenceSnapshot(snapshot)).toEqual(initial());
  });
  it("enforces constraints, same-room ownership, final normal votes, and immutable history",()=>{
    run(`begin; ${seed}
      ${raises(`insert into public.rooms(id,code,scenario_id,mode,status) values('00000000-0000-4000-8000-000000000099','7XK9','blackout','standard','waiting')`,"23505")}
      ${raises(`update public.players set role='engineer' where id='${roles.mayor}'`,"23505")}
      set local role service_role; ${commit(initial(),null,null)}
      ${raises(`update public.game_states set grid=101 where room_id='${room}'`,"23514")}
      ${raises(`update public.game_states set version=-1 where room_id='${room}'`,"23514")}
      ${raises(`insert into public.player_abilities(room_id,player_id,ability_id,owner_role,max_uses,uses_remaining) values('${room}','${roles.engineer}','unknown','engineer',3,1)`,"23514")}
      insert into public.proposals(id,sequence_no,room_id,round,creator_player_id,title,action,reason,source,status) values('p',0,'${room}',1,'${roles.engineer}','Plan','Wait','Test','player','pending');
      insert into public.votes(room_id,proposal_id,player_id,choice,sequence_no) values('${room}','p','${roles.engineer}','approve',0);
      ${raises(`update public.votes set choice='reject' where room_id='${room}'`,"23514")}
      ${raises(`insert into public.votes(room_id,proposal_id,player_id,choice,sequence_no) values('${room}','p','${roles.engineer}','reject',1)`,"23505")}
      insert into public.rooms(id,code,scenario_id,mode,status) values('00000000-0000-4000-8000-000000000099','OTHER','blackout','standard','waiting');
      ${raises(`insert into public.evidence(id,sequence_no,room_id,key,title,description,owner_player_id,visibility,verification) values('e',0,'00000000-0000-4000-8000-000000000099','march_inspection_report','Report','Secret','${roles.engineer}','private','confirmed')`,"23503")}
      rollback;`);
  });
  it("denies both browser roles every table and privileged RPC",()=>{
    for(const role of ["anon","authenticated"]) run(`begin; ${seed} set local role ${role};
      ${["rooms","players","player_sessions","game_states","proposals","votes","evidence","private_intel","player_abilities","timeline","events","messages","redline_ballots","processed_commands","collaboration_rewards","lobby_entry_requests","game_ai"].map(table=>raises(`perform 1 from public.${table}`,"42501")).join("\n")}
      ${raises(`perform public.load_engine_snapshot('${room}')`,"42501")}
      ${raises(`perform public.persist_engine_snapshot('${room}',null,null,'{}')`,"42501")}
      rollback;`);
    expect(run("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity;").trim()).toBe("17");
  });
  it("rolls back the state version when a related projection violates a constraint",()=>{
    const base=initial(); const context={commandId:"start",occurredAt:time}; const result=startGame(base,context);
    if(!result.ok) throw new Error("Fixture failed");
    const snapshot=toPersistenceSnapshot(result.state,time); snapshot.player_abilities[0].uses_remaining=-1;
    run(`begin; ${seed} set local role service_role; ${commit(base,null,null)}
      ${raises(`perform public.persist_engine_snapshot('${room}',0,'start',${literal(snapshot)})`,"23514")}
      ${assertSql(`(select version from public.game_states where room_id='${room}')=0`)}
      ${assertSql(`(select count(*) from public.processed_commands where room_id='${room}')=0`)} rollback;`);
  });
  it("rejects rewritten history and preserves the previously committed version",()=>{
    const base=initial(); const first=startGame(base,{commandId:"start",occurredAt:time});
    if(!first.ok) throw new Error("Fixture failed");
    const second=advancePhase(first.state,{commandId:"advance",occurredAt:time});
    if(!second.ok) throw new Error("Fixture failed");
    const changed=toPersistenceSnapshot(second.state,time); changed.timeline[0].message="rewritten";
    run(`begin; ${seed} set local role service_role; ${commit(base,null,null)} ${commit(first.state,0,"start")}
      ${raises(`perform public.persist_engine_snapshot('${room}',1,'advance',${literal(changed)})`,"23514")}
      ${assertSql(`(select version from public.game_states where room_id='${room}')=1`)} rollback;`);
  });
  it("persists and resumes every command in a complete engine match",()=>{
    let state=initial(); const snapshots: {state:EngineState;id:string}[]=[]; let seq=0;
    const ctx=()=>({commandId:`c${++seq}`,occurredAt:time});
    const take=(result:EngineResult)=>{if(!result.ok) throw new Error(result.error.message);state=result.state;snapshots.push({state,id:state.processedCommands.at(-1)!});};
    take(startGame(state,ctx())); take(advancePhase(state,ctx())); take(advancePhase(state,ctx())); take(advancePhase(state,ctx()));
    const responses=["r1_reduce_sector_7_load","r2_reroute_industrial_power","r3_isolate_s7","r4_independent_investigation"] as const;
    for(const [index,responseId] of responses.entries()) {
      if(index===2) {
        take(executeAbility(state,{playerId:roles.executive,abilityId:"corporate_intel"},ctx()));
        take(shareEvidence(state,{playerId:roles.executive,evidenceKey:"march_inspection_report"},ctx()));
      }
      const proposalId=`p${index}`; take(createCanonicalProposal(state,{proposalId,responseId,playerId:roles.mayor},ctx()));
      take(selectProposal(state,{proposalId,actor:{playerId:roles.mayor,isHost:true}},ctx()));
      for(const playerId of Object.values(roles)) take(submitNormalVote(state,{proposalId,playerId,choice:"approve"},ctx()));
      take(finalizeNormalVote(state,{reason:"all_votes"},ctx())); take(advancePhase(state,ctx())); take(advancePhase(state,ctx()));
    }
    take(advancePhase(state,ctx()));
    for(const playerId of Object.values(roles).slice(0,3)) take(submitRedlineSelection(state,{playerId,choice:"trust_oracle"},ctx()));
    const output=run(`begin; ${seed} set local role service_role; ${commit(initial(),null,null)}
      ${snapshots.map(({state,id})=>commit(state,state.version-1,id)).join("\n")}
      select public.load_engine_snapshot('${room}'); rollback;`);
    const loaded=fromPersistenceSnapshot(JSON.parse(output.split("\n").find(line=>line.startsWith('{"'))!) as PersistenceSnapshot);
    expect(loaded).toEqual(state); expect(loaded.status).toBe("completed"); expect(loaded.result?.ending).toBe("miracle_recovery");
  });
  it("allows only one concurrent writer at an expected version",async()=>{
    run(`${seed} set role service_role; ${commit(initial(),null,null)}`);
    try {
      const states=["writer_a","writer_b"].map(commandId=>{
        const result=startGame(initial(),{commandId,occurredAt:time}); if(!result.ok) throw new Error("Fixture failed");
        return commit(result.state,0,commandId);
      });
      const execute=promisify(execFile);
      const results=await Promise.allSettled(states.map(sql=>execute("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-c",`set role service_role; ${sql}`])));
      expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
      expect(results.filter(result=>result.status==="rejected")).toHaveLength(1);
      const rejected=results.find(result=>result.status==="rejected");
      if(rejected?.status==="rejected") expect(rejected.reason).toMatchObject({stderr:expect.stringContaining("VERSION_CONFLICT")});
      expect(run(`select version from public.game_states where room_id='${room}';`).trim()).toBe("1");
      expect(run(`select count(*) from public.processed_commands where room_id='${room}';`).trim()).toBe("1");
    } finally { run(`delete from public.rooms where id='${room}';`); }
  });
});
