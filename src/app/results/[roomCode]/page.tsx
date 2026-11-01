import Link from "next/link";
import { briefingMember } from "@/lib/briefing/http";
import { gameContext } from "@/lib/game-server/context";
import { resultsPayload } from "@/lib/game-server/results";
import { gameError } from "@/lib/game-server/errors";
import { ResultsSequence } from "@/components/results/results-sequence";
export default async function ResultsPage({params}:{params:Promise<{roomCode:string}>}) {
  let result;let message="";
  try {const {db,code,credential}=await briefingMember(params);const context=await gameContext(db,code,credential,{fullGame:true});result=resultsPayload(context.state,context.members,credential.playerId,code);}catch(error){message=gameError(error).message;}
  if(result)return <ResultsSequence result={result}/>;
  return <main className="entry-surface min-h-svh p-10"><Link className="brand-mark" href="/">REDLINE_</Link><h1 className="mt-16 text-3xl">POST-CRISIS ACCESS DENIED</h1><p role="alert" className="system-error mt-6">{message}</p></main>;
}
