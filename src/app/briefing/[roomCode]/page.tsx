import Link from "next/link";
import { redirect } from "next/navigation";
import { briefingMember } from "@/lib/briefing/http";
import { getBriefingContext, privateBriefingPayload } from "@/lib/briefing/service";
import { publicLobbyError } from "@/lib/rooms/errors";
import { ClassifiedBriefing } from "@/components/briefing/classified-briefing";
import { gameContext } from "@/lib/game-server/context";
export default async function BriefingPage({params}:{params:Promise<{roomCode:string}>}) {
  let payload;let failure="";let destination="";
  try {
    const {db,code,credential}=await briefingMember(params);
    try {
      const context=await getBriefingContext(db,code,credential);
      payload={briefing:privateBriefingPayload(context),status:context.status};
    }catch(error){
      if(typeof error!=="object"||error===null||!("code"in error)||error.code!=="BRIEFING_UNAVAILABLE")throw error;
      await gameContext(db,code,credential,{fullGame:true});destination=`/crisis/${code}`;
    }
  } catch(error) {
    failure=publicLobbyError(error).message;
  }
  if(destination)redirect(destination);
  if(payload?.status.phase==="mission_intro")redirect(`/crisis/${payload.status.code}`);
  if(payload)return <ClassifiedBriefing briefing={payload.briefing} initial={payload.status}/>;
  return <main className="entry-surface min-h-svh p-10"><Link href="/" className="brand-mark">REDLINE_</Link>
      <section className="mx-auto mt-24 max-w-xl access-panel p-9"><p className="eyebrow text-emergency">ACCESS DENIED</p><h1 className="mt-5 text-2xl">Classified channel unavailable.</h1>
      <p role="alert" className="mt-5 text-muted">{failure}</p><Link href="/" className="command-button mt-8">RETURN TO ACCESS</Link></section></main>;
}
