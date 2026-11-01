import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const uuid=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const hash=(n:number)=>createHash("sha256").update(`test-credential-${n}`).digest("hex");
const entry=(n:number,operation="join",code="CREW",callsign=`Operator_${n}`)=>`select public.enter_lobby('${uuid(1000+n)}','${hash(1000+n)}','${hash(n)}','${operation}','${uuid(100+n)}','${uuid(n)}','${code}','${callsign}','demo');`;
const create=()=>entry(1,"create","CREW","Maulik");
const snapshot=(code="CREW",player=1,token=1)=>`public.get_lobby_snapshot('${code}','${uuid(player)}','${hash(token)}')`;
const mutation=(player:number,token:number,action:string,ready="null",room=101)=>`perform public.update_lobby_member('${uuid(room)}','${uuid(player)}','${hash(token)}','${action}',${ready})`;
const assertSql=(expression:string)=>`do $$ begin if not (${expression}) then raise exception 'ASSERTION_FAILED'; end if; end $$;`;
const failure=(sql:string,message:string)=>`do $test$ declare caught boolean=false; begin begin ${sql.trim().replace(/;$/,"").replace(/^select /,"perform ")}; exception when others then if sqlerrm<>'${message}' then raise; end if; caught=true; end;
  if not caught then raise exception 'EXPECTED_FAILURE: ${message}'; end if; end $test$;`;

export function registerLobbyTests(run:(sql:string)=>string,url:string|undefined) {
  describe("lobby transactions",()=>{
    it("creates the host, selected mode, hashed session, and no game state or roles",()=>{
      run(`begin; set local role service_role; ${create()}
        ${assertSql(`(select host_player_id='${uuid(1)}' and mode='demo' from public.rooms where code='CREW')`)}
        ${assertSql(`(select is_host and not is_ready and role is null from public.players where id='${uuid(1)}')`)}
        ${assertSql(`(select token_hash='${hash(1)}' from public.player_sessions where player_id='${uuid(1)}')`)}
        ${assertSql(`(select count(*) from public.game_states where room_id='${uuid(101)}')=0`)} rollback;`);
    });
    it("joins once and restores/reads without duplicate membership",()=>{
      run(`begin; set local role service_role; ${create()} ${entry(2)} ${entry(2)}
        select ${snapshot("CREW",2,2)}; select ${snapshot("CREW",2,2)};
        ${assertSql(`(select count(*) from public.players where room_id='${uuid(101)}' and left_at is null)=2`)} rollback;`);
    });
    it("replays create requests idempotently and rejects code collisions atomically",()=>{
      run(`begin; set local role service_role; ${create()} ${create()}
        ${assertSql(`(select count(*) from public.rooms where code='CREW')=1`)}
        ${failure(entry(2,"create"),"ROOM_CODE_COLLISION")}
        ${assertSql(`(select count(*) from public.players where room_id='${uuid(101)}')=1`)} rollback;`);
    });
    it("rejects case-insensitive duplicate callsigns",()=>{
      run(`begin; set local role service_role; ${create()} ${failure(entry(2,"join","CREW","MAULIK"),"CALLSIGN_TAKEN")}
        ${assertSql(`(select count(*) from public.player_sessions where room_id='${uuid(101)}')=1`)} rollback;`);
    });
    it("rejects missing, full, and non-waiting rooms",()=>{
      run(`begin; set local role service_role; ${create()}
        ${failure(entry(2,"join","NONE"),"ROOM_NOT_FOUND")}
        ${entry(2)} ${entry(3)} ${entry(4)} ${failure(entry(5),"ROOM_FULL")}
        update public.rooms set status='active' where code='CREW';
        ${failure(entry(6),"ROOM_IN_PROGRESS")} rollback;`);
    });
    it("allows only the credential's player to change readiness",()=>{
      run(`begin; set local role service_role; ${create()} ${entry(2)}
        do $$ begin ${mutation(1,1,"ready","true")}; end $$;
        ${assertSql(`(select is_ready from public.players where id='${uuid(1)}')`)}
        ${failure(mutation(2,1,"ready","true"),"INVALID_SESSION")}
        ${failure(mutation(1,2,"ready","false"),"INVALID_SESSION")}
        ${assertSql(`(select not is_ready from public.players where id='${uuid(2)}')`)} rollback;`);
    });
    it("rejects cross-room credentials and exposes only safe lobby fields",()=>{
      const output=run(`begin; set local role service_role; ${create()} ${entry(2,"create","OTHER")}
        ${failure(`perform ${snapshot("OTHER",1,1)}`,"INVALID_SESSION")}
        select ${snapshot()}; rollback;`);
      const view=JSON.parse(output.split("\n").find(line=>line.includes('"selfPlayerId"'))!);
      expect(Object.keys(view).sort()).toEqual(["code","mode","players","selfPlayerId","status"]);
      expect(Object.keys(view.players[0]).sort()).toEqual(["displayName","id","isHost","isReady"]);
    });
    it("leave revokes the session, retains history/host, frees the slot/callsign, and permits a new membership",()=>{
      run(`begin; set local role service_role; ${create()}
        do $$ begin ${mutation(1,1,"leave")}; end $$;
        ${failure(`perform ${snapshot()}`,"INVALID_SESSION")}
        ${failure(mutation(1,1,"ready","true"),"INVALID_SESSION")}
        ${assertSql(`(select revoked_at is not null from public.player_sessions where player_id='${uuid(1)}')`)}
        ${assertSql(`(select left_at is not null from public.players where id='${uuid(1)}')`)}
        ${entry(2,"join","CREW","MAULIK")}
        ${assertSql(`(select host_player_id='${uuid(1)}' from public.rooms where code='CREW')`)}
        ${assertSql(`(select count(*) from public.players where room_id='${uuid(101)}' and left_at is null)=1`)} rollback;`);
    });
    it("denies browser execution of all lobby RPCs",()=>{
      for(const role of ["anon","authenticated"]) {
        const output=run(`select has_function_privilege('${role}','public.enter_lobby(uuid,text,text,text,uuid,uuid,text,text,text)','EXECUTE'),
          has_function_privilege('${role}','public.get_lobby_snapshot(text,uuid,text)','EXECUTE'),
          has_function_privilege('${role}','public.update_lobby_member(uuid,uuid,text,text,boolean)','EXECUTE');`);
        expect(output.trim()).toBe("f|f|f");
      }
    });
    it("serializes simultaneous joins competing for the final slot",async()=>{
      run(`set role service_role; ${create()} ${entry(2)} ${entry(3)}`);
      try{
        const execute=promisify(execFile);
        const results=await Promise.allSettled([4,5].map(n=>execute("psql",["--no-psqlrc","--dbname",url!,"-v","ON_ERROR_STOP=1","-c",`set role service_role; ${entry(n)}`])));
        expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
        const rejected=results.find(result=>result.status==="rejected");
        expect(rejected).toMatchObject({status:"rejected",reason:{stderr:expect.stringContaining("ROOM_FULL")}});
        expect(run(`select count(*) from public.players where room_id='${uuid(101)}' and left_at is null;`).trim()).toBe("4");
        expect(run(`select count(*) from public.player_sessions where room_id='${uuid(101)}';`).trim()).toBe("4");
      }finally{run(`delete from public.rooms where id='${uuid(101)}';`);}
    });
  });
}
