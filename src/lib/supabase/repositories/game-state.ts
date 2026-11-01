import "server-only";
import type { EngineState } from "@/lib/game";
import { checkDatabaseError, persistenceFailure } from "../errors";
import { fromPersistenceSnapshot, toPersistenceSnapshot } from "../mapping";
import type { ServerDatabaseClient } from "../server";

/** Privileged engine load, never a browser DTO. RPC reads under a room lock. */
export async function loadGameState(db: ServerDatabaseClient, roomId: string): Promise<EngineState | null> {
  const {data,error}=await db.rpc("load_engine_snapshot",{p_room_id:roomId});
  checkDatabaseError(error);
  return data === null ? null : fromPersistenceSnapshot(data);
}

export async function insertInitialGameState(db: ServerDatabaseClient, state: EngineState, occurredAt: string): Promise<number> {
  if(state.version!==0 || state.processedCommands.length) persistenceFailure("INVALID_INITIAL_STATE","Initial state must have version zero and no processed commands.");
  const {data,error}=await db.rpc("persist_engine_snapshot",{
    p_room_id:state.roomId,p_expected_version:null,p_command_id:null,p_snapshot:toPersistenceSnapshot(state,occurredAt),
  });
  checkDatabaseError(error);
  if(data!==state.version) persistenceFailure("VERSION_CONFLICT","Stored version did not match the initial state.");
  return data;
}

export async function persistGameStateWithVersion(db: ServerDatabaseClient, state: EngineState,
  input: {expectedVersion:number; commandId:string; occurredAt:string}): Promise<number> {
  if(state.version!==input.expectedVersion+1 || state.processedCommands.at(-1)!==input.commandId) persistenceFailure("INVALID_COMMIT","Commit must contain exactly the accepted next engine version and command.");
  const {data,error}=await db.rpc("persist_engine_snapshot",{
    p_room_id:state.roomId,p_expected_version:input.expectedVersion,p_command_id:input.commandId,
    p_snapshot:toPersistenceSnapshot(state,input.occurredAt),
  });
  checkDatabaseError(error);
  if(data!==state.version) persistenceFailure("VERSION_CONFLICT","Stored version did not match the accepted state.");
  return data;
}
