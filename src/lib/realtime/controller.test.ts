import { afterEach, describe, expect, it, vi } from "vitest";
import { createLobbySync } from "./controller";
import type { RoomEvents } from "./controller";
import { onlinePlayers } from "./shared";

afterEach(() => vi.useRealTimers());
function fixture() {
  vi.useFakeTimers();
  let events!: RoomEvents;
  const close = vi.fn(); const renew = vi.fn().mockResolvedValue(undefined);
  const fetchSnapshot = vi.fn().mockResolvedValue({ ready: false });
  const snapshot = vi.fn(); const status = vi.fn(); const presence = vi.fn(); const error = vi.fn();
  const connect = vi.fn(async (handlers: RoomEvents) => { events = handlers; return { close, renew }; });
  const visible = vi.fn().mockReturnValue(true);
  const sync = createLobbySync({ fetchSnapshot, connect, snapshot, status, presence, error, visible });
  return { sync, fetchSnapshot, snapshot, status, presence, error, connect, close, renew, visible, events: () => events };
}
describe("presence aggregation", () => {
  it("tracks one meta, multiple tabs, one tab leaving and last tab leaving", () => {
    expect([...onlinePlayers({ tabA: [{ playerId: "A" }] })]).toEqual(["A"]);
    expect([...onlinePlayers({ A: [{ playerId: "A" }, { playerId: "A" }] })]).toEqual(["A"]);
    expect([...onlinePlayers({ A: [{ playerId: "A" }] })]).toEqual(["A"]);
    expect([...onlinePlayers({})]).toEqual([]);
    expect([...onlinePlayers({ malicious: [{ playerId: 42 }] })]).toEqual([]);
  });
  it("supports four independent identities without duplicate operators", () => {
    expect(onlinePlayers({ A: [{playerId:"A"},{playerId:"A"}], B:[{playerId:"B"}], C:[{playerId:"C"}], D:[{playerId:"D"}] }).size).toBe(4);
  });
});
describe("lobby synchronization lifecycle", () => {
  it("connects, becomes live, reconnects, reports errors, and recovers", async () => {
    const f = fixture(); await vi.advanceTimersByTimeAsync(75);
    expect(f.status).toHaveBeenCalledWith("connecting");
    for (const state of ["live","reconnecting","offline","live"] as const) {
      f.events().status(state); expect(f.status).toHaveBeenLastCalledWith(state);
    }
    f.sync.stop();
  });
  it("coalesces rapid notifications into one authoritative refresh", async () => {
    const f = fixture(); await vi.advanceTimersByTimeAsync(75); f.fetchSnapshot.mockClear();
    for (let i=0;i<20;i++) f.events().invalidate();
    await vi.advanceTimersByTimeAsync(75);
    expect(f.fetchSnapshot).toHaveBeenCalledTimes(1); f.sync.stop();
  });
  it("discards a slower old response even when the request ignores abort", async () => {
    const f = fixture(); let resolveOld!: (value:{ready:boolean})=>void;
    f.fetchSnapshot.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    await vi.advanceTimersByTimeAsync(75);
    f.fetchSnapshot.mockResolvedValue({ready:true}); f.sync.refresh(); await vi.advanceTimersByTimeAsync(75);
    resolveOld({ready:false}); await Promise.resolve();
    expect(f.snapshot).toHaveBeenCalledTimes(1); expect(f.snapshot).toHaveBeenLastCalledWith({ready:true}); f.sync.stop();
  });
  it("uses fast fallback offline, slow safety polling live, and refetches on recovery", async () => {
    const f = fixture(); await vi.advanceTimersByTimeAsync(75); f.fetchSnapshot.mockClear();
    await vi.advanceTimersByTimeAsync(2500); expect(f.fetchSnapshot).toHaveBeenCalledTimes(1);
    f.events().status("live"); await vi.advanceTimersByTimeAsync(75); f.fetchSnapshot.mockClear();
    await vi.advanceTimersByTimeAsync(5000); expect(f.fetchSnapshot).not.toHaveBeenCalled();
    f.events().status("offline"); await vi.advanceTimersByTimeAsync(2575); expect(f.fetchSnapshot).toHaveBeenCalledTimes(1);
    f.events().status("live"); await vi.advanceTimersByTimeAsync(75); expect(f.fetchSnapshot).toHaveBeenCalledTimes(2); f.sync.stop();
  });
  it("recovers a missed broadcast through the live safety poll", async () => {
    const f = fixture(); f.events().status("live"); await vi.advanceTimersByTimeAsync(75); f.fetchSnapshot.mockClear();
    await vi.advanceTimersByTimeAsync(30000); expect(f.fetchSnapshot).toHaveBeenCalledTimes(1); f.sync.stop();
  });
  it("retries unavailable infrastructure and closes old channels before retry", async () => {
    const f = fixture(); await Promise.resolve(); f.events().status("offline");
    await vi.advanceTimersByTimeAsync(10000);
    expect(f.close).toHaveBeenCalledTimes(1); expect(f.connect).toHaveBeenCalledTimes(2); f.sync.stop();
  });
  it("cleans up once and suppresses late callbacks and pending snapshots", async () => {
    const f = fixture(); await Promise.resolve(); f.sync.stop(); f.sync.stop();
    f.status.mockClear(); f.snapshot.mockClear(); f.presence.mockClear();
    f.events().status("live"); f.events().invalidate(); f.events().presence(new Set(["A"]));
    await vi.advanceTimersByTimeAsync(300000);
    expect(f.close).toHaveBeenCalledTimes(1); expect(f.status).not.toHaveBeenCalled();
    expect(f.snapshot).not.toHaveBeenCalled(); expect(f.presence).not.toHaveBeenCalled();
  });
  it("closes a subscription that finishes connecting after cleanup", async () => {
    vi.useFakeTimers(); let resolve!: (value:{close:()=>void;renew:()=>Promise<void>})=>void;
    const close=vi.fn();
    const sync=createLobbySync({fetchSnapshot:vi.fn(),connect:()=>new Promise(r=>{resolve=r;}),snapshot:vi.fn(),status:vi.fn(),presence:vi.fn(),error:vi.fn(),visible:()=>true});
    sync.stop(); resolve({close,renew:async()=>{}}); await Promise.resolve(); expect(close).toHaveBeenCalledOnce();
  });
  it("pauses fallback snapshots while hidden and refreshes on network return", async () => {
    const f=fixture(); await vi.advanceTimersByTimeAsync(75); f.fetchSnapshot.mockClear(); f.visible.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(5000); expect(f.fetchSnapshot).not.toHaveBeenCalled();
    f.sync.network(false); expect(f.status).toHaveBeenLastCalledWith("offline");
    f.sync.network(true); await vi.advanceTimersByTimeAsync(75); expect(f.fetchSnapshot).toHaveBeenCalledOnce(); f.sync.stop();
  });
  it("renews short-lived channel access and falls back on failed renewal", async () => {
    const f=fixture(); await Promise.resolve(); f.events().status("live"); f.renew.mockRejectedValue(new Error("revoked"));
    await vi.advanceTimersByTimeAsync(240000); expect(f.renew).toHaveBeenCalled(); expect(f.status).toHaveBeenLastCalledWith("offline"); f.sync.stop();
  });
});
