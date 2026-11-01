import "server-only";
import { NextResponse } from "next/server";
import { lobbyFailure, publicLobbyError } from "./errors";

export function assertSameOrigin(request:Request):void {
  // Next may use localhost internally even when the incoming Host is 127.0.0.1.
  const url=new URL(request.url);
  const host=request.headers.get("host") ?? url.host;
  const protocol=request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? url.protocol.slice(0,-1);
  if(!["http","https"].includes(protocol)||request.headers.get("origin")!==`${protocol}://${host}` || request.headers.get("sec-fetch-site")==="cross-site")lobbyFailure("INVALID_REQUEST");
}
export async function readJson(request:Request):Promise<unknown> {
  if(!request.headers.get("content-type")?.startsWith("application/json"))lobbyFailure("INVALID_REQUEST");
  const text=await request.text();if(text.length>2048)lobbyFailure("INVALID_REQUEST");
  try{return JSON.parse(text) as unknown;}catch{lobbyFailure("INVALID_REQUEST");}
}
export function errorResponse(error:unknown) {
  const payload=publicLobbyError(error);
  const status=payload.code==="SERVICE_UNAVAILABLE"?503:payload.code==="INVALID_SESSION"?401:payload.code==="ROOM_NOT_FOUND"?404:
    ["ROOM_FULL","CALLSIGN_TAKEN","ROOM_IN_PROGRESS"].includes(payload.code)?409:400;
  return NextResponse.json(payload,{status,headers:{"Cache-Control":"no-store"}});
}
