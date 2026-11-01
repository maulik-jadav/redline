import { describe, expect, it } from "vitest";

/** Real Postgres policy tests; the managed Realtime table is a local test fixture. */
export function registerRealtimeTests(run:(sql:string)=>string) {
  const room="00000000-0000-4000-8000-000000000810";
  const player="00000000-0000-4000-8000-000000000811";
  const claims=JSON.stringify({sub:player,redline_room:"RT07",redline_realtime:true});
  const seed=`insert into public.rooms(id,code,scenario_id,mode,status) values('${room}','RT07','blackout','standard','waiting');
    insert into public.players(id,room_id,display_name) values('${player}','${room}','Realtime');
    insert into public.player_sessions(room_id,player_id,token_hash) values('${room}','${player}','${"a".repeat(64)}');`;
  const context=`set local role authenticated; set local "request.jwt.claims"='${claims}'; set local "realtime.topic"='redline:room:RT07';`;
  const denied=(sql:string)=>`do $test$ begin begin ${sql}; raise exception 'EXPECTED_DENIAL'; exception when insufficient_privilege then null; end; end $test$;`;
  describe("private lobby Realtime authorization",()=>{
    it("allows active membership to receive safe traffic and publish presence only",()=>{
      const result=run(`begin; ${seed}
        insert into realtime.messages(extension) values('broadcast'),('presence'); ${context}
        select count(*) from realtime.messages;
        insert into realtime.messages(extension) values('presence');
        ${denied("insert into realtime.messages(extension) values('broadcast')")}
        ${denied("perform 1 from public.players")}
        ${denied("perform 1 from public.player_sessions")}
        rollback;`);
      expect(result.split("\n")).toContain("2");
    });
    it("rejects wrong room, forged identity, missing capability and room-code-only access",()=>{
      const variants=[{}, {sub:player,redline_room:"RT07"}, {sub:player,redline_room:"NOPE",redline_realtime:true},
        {sub:"00000000-0000-4000-8000-000000000899",redline_room:"RT07",redline_realtime:true}];
      for(const value of variants) {
        const output=run(`begin; ${seed} insert into realtime.messages(extension) values('broadcast');
          ${context} set local "request.jwt.claims"='${JSON.stringify(value)}';
          select count(*) from realtime.messages;
          ${denied("insert into realtime.messages(extension) values('presence')")}
          rollback;`);
        expect(output.split("\n")).toContain("0");
      }
    });
    it("rejects cross-topic access even with a valid room capability",()=>{
      const result=run(`begin; ${seed} ${context}
        select public.can_access_lobby_realtime('redline:room:OTHER'); rollback;`);
      expect(result.split("\n")).toContain("f");
    });
    it("denies revoked and explicitly left memberships on authorization",()=>{
      for(const mutation of [`update public.player_sessions set revoked_at=now() where player_id='${player}';`,
        `update public.players set left_at=now() where id='${player}';`]) {
        const result=run(`begin; ${seed} ${mutation} ${context}
          select public.can_access_lobby_realtime('redline:room:RT07');
          ${denied("insert into realtime.messages(extension) values('presence')")}
          rollback;`);
        expect(result.split("\n")).toContain("f");
      }
    });
    it("denies anonymous helper execution and transport traffic",()=>{
      run(`begin; set local role anon;
        ${denied("perform public.can_access_lobby_realtime('redline:room:RT07')")}
        ${denied("perform 1 from realtime.messages")}
        rollback;`);
    });
  });
}
