import { expect,it,vi } from "vitest";
import { submitVersionedCommand } from "./submit-command";
it("refreshes after conflicts and reuses the caller's command until success",async()=>{
  let version=1;const seen:number[]=[];
  const post=vi.fn(async()=>{seen.push(version);return version===3?{ok:true as const,data:null}:{ok:false as const,code:"STATE_CHANGED",message:"Refresh"};});
  const refresh=vi.fn(async()=>{version++;});
  expect(await submitVersionedCommand(post,refresh)).toEqual({ok:true,data:null});expect(seen).toEqual([1,2,3]);expect(refresh).toHaveBeenCalledTimes(2);
});
it("bounds contention retries and never retries a rejected vote/expired phase",async()=>{
  const refresh=vi.fn(async()=>{});const conflict=vi.fn(async()=>({ok:false as const,code:"STATE_CHANGED",message:"Refresh"}));
  await submitVersionedCommand(conflict,refresh);expect(conflict).toHaveBeenCalledTimes(4);
  for(const code of ["ALREADY_VOTED","PHASE_EXPIRED","INVALID_SESSION"]){const post=vi.fn(async()=>({ok:false as const,code,message:"Rejected"}));await submitVersionedCommand(post,refresh);expect(post).toHaveBeenCalledOnce();}
});
