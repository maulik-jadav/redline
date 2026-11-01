import { afterEach, describe, expect, it, vi } from "vitest";
const { factory } = vi.hoisted(()=>({factory:vi.fn()}));
vi.mock("@/lib/supabase/client",()=>({createBrowserSupabaseClient:factory}));
import { connectLobby } from "./browser";

afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
function setup() {
  const handlers=new Map<string,()=>void>(); let status!: (value:string)=>void;
  const channel={
    on:vi.fn((type:string,filter:{event:string},callback:()=>void)=>{handlers.set(`${type}:${filter.event}`,callback);return channel;}),
    subscribe:vi.fn((callback:(value:string)=>void)=>{status=callback;return channel;}),
    track:vi.fn().mockResolvedValue("ok"), untrack:vi.fn().mockResolvedValue("ok"),
    presenceState:vi.fn().mockReturnValue({A:[{playerId:"A"},{playerId:"A"}]}),
  };
  const client={channel:vi.fn().mockReturnValue(channel),realtime:{setAuth:vi.fn().mockResolvedValue(undefined),disconnect:vi.fn()},removeChannel:vi.fn().mockResolvedValue("ok")};
  factory.mockReturnValue(client);
  const grant={token:"short-lived-transport-capability",playerId:"A",topic:"redline:room:7XK9",expiresAt:1300};
  const fetch=vi.fn().mockResolvedValue({json:async()=>({ok:true,data:grant})});vi.stubGlobal("fetch",fetch);
  const events={status:vi.fn(),presence:vi.fn(),invalidate:vi.fn()}; const abort=new AbortController();
  return {channel,client,grant,fetch,events,abort,handlers,status:(value:string)=>status(value)};
}
describe("Supabase channel adapter with fake transport",()=>{
  it("authorizes before subscribing to exactly one private room channel",async()=>{
    const f=setup(); const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    expect(f.client.realtime.setAuth).toHaveBeenCalledWith(f.grant.token);
    expect(f.client.channel).toHaveBeenCalledExactlyOnceWith("redline:room:7XK9",{config:{private:true,presence:{key:"A"}}});
    f.status("SUBSCRIBED");await Promise.resolve();
    expect(f.channel.track).toHaveBeenCalledWith({playerId:"A"}); expect(f.events.status).toHaveBeenLastCalledWith("live");
    connection.close();
  });
  it("handles initial sync, join and leave using the complete presence state",async()=>{
    const f=setup(); const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    for(const event of ["sync","join","leave"]) {f.handlers.get(`presence:${event}`)!();expect(f.events.presence).toHaveBeenLastCalledWith(new Set(["A"]));}
    f.channel.presenceState.mockReturnValue({});f.handlers.get("presence:leave")!();
    expect(f.events.presence).toHaveBeenLastCalledWith(new Set());connection.close();
  });
  it("requests snapshots for notifications and re-tracks on subscription recovery",async()=>{
    const f=setup();const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    f.handlers.get("broadcast:lobby_changed")!();expect(f.events.invalidate).toHaveBeenCalledOnce();
    f.status("SUBSCRIBED");await Promise.resolve();f.status("CLOSED");expect(f.events.status).toHaveBeenLastCalledWith("reconnecting");
    f.status("SUBSCRIBED");await Promise.resolve();expect(f.channel.track).toHaveBeenCalledTimes(2);connection.close();
  });
  it("cleans up on abort and ignores callbacks after removal",async()=>{
    const f=setup(); const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    f.abort.abort();connection.close(); f.status("SUBSCRIBED");f.handlers.get("broadcast:lobby_changed")!();
    await Promise.resolve();
    expect(f.channel.untrack).toHaveBeenCalledOnce();expect(f.client.removeChannel).toHaveBeenCalledOnce();expect(f.client.realtime.disconnect).toHaveBeenCalledOnce();
    expect(f.channel.track).not.toHaveBeenCalled();expect(f.events.invalidate).not.toHaveBeenCalled();
  });
  it("does not subscribe without server-derived membership identity",async()=>{
    const f=setup();f.grant.playerId="someone-else";
    await expect(connectLobby("7XK9","A",f.events,f.abort.signal)).rejects.toThrow();expect(f.client.channel).not.toHaveBeenCalled();
  });
  it("keeps fallback active if Presence tracking fails",async()=>{
    const f=setup();f.channel.track.mockResolvedValue("timed out");const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    f.status("SUBSCRIBED");await Promise.resolve();expect(f.events.status).toHaveBeenLastCalledWith("offline");connection.close();
  });
  it("renews authentication in memory without creating a second channel",async()=>{
    const f=setup();const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    await connection.renew();expect(f.fetch).toHaveBeenCalledTimes(2);expect(f.client.channel).toHaveBeenCalledOnce();connection.close();
  });
  it("does not report LIVE when an old track acknowledgement arrives after disconnect",async()=>{
    const f=setup();let resolve!: (value:string)=>void;
    f.channel.track.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
    const connection=await connectLobby("7XK9","A",f.events,f.abort.signal);
    f.status("SUBSCRIBED");f.status("CHANNEL_ERROR");resolve("ok");await Promise.resolve();
    expect(f.events.status).toHaveBeenLastCalledWith("offline");connection.close();
  });
});
