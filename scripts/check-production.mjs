import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const required=["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","SUPABASE_REALTIME_JWT_SECRET"];
const missing=required.filter(key=>!process.env[key]);
let hosted=false;try{const url=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??"");hosted=url.protocol==="https:"&&!/^(localhost|127\.|\[::1\])/.test(url.hostname);}catch{/* Missing or invalid URL is reported without its value. */}
const realtime=(process.env.SUPABASE_REALTIME_JWT_SECRET?.length??0)>=32;
const ai=process.env.AI_PROVIDER==="anthropic"&&!!process.env.AI_API_KEY;
console.log("APP / CONFIGURATION DIAGNOSTIC (no connection test)");
for(const key of required)console.log(`${key}: ${process.env[key]?"CONFIGURED":"MISSING"}`);
console.log(`HOSTED DATABASE URL: ${hosted?"CONFIGURED":"NOT CONFIGURED"}`);
console.log(`REALTIME SIGNING: ${realtime?"CONFIGURED — VERIFY LIVE CHANNELS":"UNAVAILABLE"}`);
console.log(`AI GAME MASTER: ${ai?"PROVIDER CONFIGURED — REAL CALL NOT VERIFIED":"FALLBACK MODE"}`);
if(missing.length||!hosted||!realtime){console.log("DEPLOYMENT READINESS: BLOCKED BY CONFIGURATION");process.exitCode=1;}else console.log("CONFIGURATION READY — hosted migrations, Realtime, and smoke tests still required.");
