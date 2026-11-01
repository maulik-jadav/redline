"use client";
export const SOUND_CUES={intel_received:[660,880],warning:[330,294],vote_start:[440,660],vote_submit:[740],decision_authorized:[440,554,660],decision_rejected:[220,165],critical_event:[196,147],sector_offline:[150,90],redline_activation:[110,147,110],victory:[440,554,660,880],collapse:[196,147,98]} as const;
export type SoundCue=keyof typeof SOUND_CUES;
/** Bounded event identities suppress duplicate polls, retries, and overlapping alerts. */
export function createCueGate(){const seen=new Set<string>();let last=-Infinity;return (key:string,now:number)=>{if(seen.has(key))return false;seen.add(key);if(seen.size>128)seen.delete(seen.values().next().value!);if(now-last<180)return false;last=now;return true;};}
let enabled=false;let context:AudioContext|undefined;let master:GainNode|undefined;
const listeners=new Set<()=>void>();const gate=createCueGate();const preference="redline-sound";
function update(value:boolean){enabled=value;for(const listener of listeners)listener();}
export const soundPreference={subscribe(listener:()=>void){listeners.add(listener);return ()=>{listeners.delete(listener);};},snapshot:()=>enabled,serverSnapshot:()=>false,restore(){try{update(localStorage.getItem(preference)==="on");}catch{update(false);}}};
/** Called only from trusted pointer/keyboard interaction, never from a timer. */
export async function unlockSound(){
  if(!enabled)return false;
  try {const Audio=window.AudioContext??(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Audio)return false;if(!context){context=new Audio();master=context.createGain();master.gain.value=.045;master.connect(context.destination);}if(context.state==="suspended")await context.resume();return context.state==="running";}catch{return false;}
}
export async function toggleSound(){const next=!enabled;update(next);try{localStorage.setItem(preference,next?"on":"off");}catch{/* Preference is optional in private browsing. */}if(master&&context)master.gain.setValueAtTime(next ? .045 : 0,context.currentTime);if(next){const ready=await unlockSound();if(!ready){update(false);return;}playSound("intel_received",`sound-enabled:${Date.now()}`);}}
export function playSound(cue:SoundCue,key:string){
  if(!enabled||!context||context.state!=="running"||!master||document.hidden||!gate(key,performance.now()))return;
  const now=context.currentTime;
  SOUND_CUES[cue].forEach((frequency,index)=>{const oscillator=context!.createOscillator();const envelope=context!.createGain();const start=now+index*.105;oscillator.type="sine";oscillator.frequency.setValueAtTime(frequency,start);envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(1,start+.012);envelope.gain.exponentialRampToValueAtTime(.001,start+.15);oscillator.connect(envelope);envelope.connect(master!);oscillator.start(start);oscillator.stop(start+.17);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};});
}
