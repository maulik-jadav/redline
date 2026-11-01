export type CommandResponse={ok:true;data:null}|{ok:false;code:string;message:string};
/** Retry only an explicit version conflict, after an authorized snapshot refresh. */
export async function submitVersionedCommand(post:()=>Promise<CommandResponse>,refresh:()=>Promise<void>):Promise<CommandResponse> {
  let result:CommandResponse;
  for(let attempt=0;;attempt++) {
    result=await post();
    if(result.ok||result.code!=="STATE_CHANGED"||attempt===3)return result;
    await refresh();
  }
}
