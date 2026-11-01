import { afterEach, expect, it, vi } from "vitest";
import { createLobbySync } from "./controller";
import type { RoomEvents } from "./controller";
import { briefingDestination } from "./navigation";
import type { LobbyView } from "@/types/lobby";
import type { BriefingStatus } from "@/types/briefing";
afterEach(()=>vi.useRealTimers());
it("room invalidation refreshes the lobby and requests briefing navigation",async()=>{
  vi.useFakeTimers();let events!:RoomEvents;const navigate=vi.fn();
  const lobby:LobbyView={code:"TEST",mode:"demo",status:"waiting",selfPlayerId:"self",players:[]};
  const fetchSnapshot=vi.fn().mockResolvedValue(lobby);
  const sync=createLobbySync<LobbyView>({fetchSnapshot,connect:async value=>{events=value;return {close:()=>{},renew:async()=>{}};},snapshot:value=>{const path=briefingDestination(value);if(path)navigate(path);},status:()=>{},presence:()=>{},error:()=>{},visible:()=>true});
  await vi.advanceTimersByTimeAsync(75);expect(navigate).not.toHaveBeenCalled();
  fetchSnapshot.mockResolvedValue({...lobby,status:"active"});events.invalidate();await vi.advanceTimersByTimeAsync(75);
  expect(navigate).toHaveBeenCalledWith("/briefing/TEST");sync.stop();
});
it("acknowledgement invalidation refreshes only the safe status snapshot",async()=>{
  vi.useFakeTimers();let events!:RoomEvents;const snapshot=vi.fn();
  const status:BriefingStatus={code:"TEST",status:"active",phase:"briefing",selfPlayerId:"self",operators:[],acknowledgedCount:3,allAcknowledged:false};
  const fetchSnapshot=vi.fn().mockResolvedValue(status);
  const sync=createLobbySync<BriefingStatus>({fetchSnapshot,connect:async value=>{events=value;return {close:()=>{},renew:async()=>{}};},snapshot,status:()=>{},presence:()=>{},error:()=>{},visible:()=>true});
  await vi.advanceTimersByTimeAsync(75);fetchSnapshot.mockResolvedValue({...status,phase:"mission_intro",acknowledgedCount:4,allAcknowledged:true});events.invalidate();await vi.advanceTimersByTimeAsync(75);
  expect(snapshot).toHaveBeenLastCalledWith(expect.objectContaining({phase:"mission_intro",acknowledgedCount:4,allAcknowledged:true}));sync.stop();
});
