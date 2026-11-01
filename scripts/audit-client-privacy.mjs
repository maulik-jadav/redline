import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root=fileURLToPath(new URL("../",import.meta.url));
createRequire(import.meta.url)("@next/env").loadEnvConfig(root);
const source=readFileSync(join(root,"src/data/blackout/roles.ts"),"utf8");
const secrets=[...source.matchAll(/secret: ("(?:[^"\\]|\\.)*")/g)].map(match=>JSON.parse(match[1]));
if(secrets.length!==4)throw new Error("Expected four canonical secrets for the audit.");
const rounds=readFileSync(join(root,"src/data/blackout/rounds.ts"),"utf8");
const intel=[...rounds.matchAll(/text: ("(?:[^"\\]|\\.)*")/g)].map(match=>JSON.parse(match[1]));
const evidenceSource=readFileSync(join(root,"src/data/blackout/evidence.ts"),"utf8");
const evidence=[...evidenceSource.matchAll(/content: ("(?:[^"\\]|\\.)*")/g)].map(match=>JSON.parse(match[1]));
const clues=[...rounds.matchAll(/additionalClues:\s*\[([\s\S]*?)\]/g)].flatMap(match=>[...match[1].matchAll(/"(?:[^"\\]|\\.)*"/g)].map(value=>JSON.parse(value[0])));
if(intel.length!==10||clues.length!==1||evidence.length!==7)throw new Error("Expected all round intelligence and seven evidence definitions for the audit.");
function files(directory){return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]);}
const output=files(join(root,".next/static")).filter(path=>/\.(js|map)$/.test(path));
if(!output.length)throw new Error("Build client output before running the privacy audit.");
const configuredSecrets=["SUPABASE_SERVICE_ROLE_KEY","AI_API_KEY","SUPABASE_REALTIME_JWT_SECRET"].map(key=>process.env[key]).filter(value=>value&&value.length>=16);
const leaks=output.filter(path=>{
  const text=readFileSync(path,"utf8");
  return configuredSecrets.some(value=>text.includes(value))||[...secrets,...intel,...clues,...evidence].some(secret=>text.includes(secret)||text.includes(secret.slice(0,64))||text.includes(JSON.stringify(secret).slice(1,-1)))||/cascadeRisk|cascade_risk|hiddenMetrics|AI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_REALTIME_JWT_SECRET/.test(text);
});
if(leaks.length)throw new Error(`Canonical private briefing material found in client output: ${leaks.join(", ")}`);
console.log(`Audited ${output.length} client JavaScript/source-map files: four role secrets, ${intel.length} private intel literals, ${clues.length} additional clue, seven evidence definitions, privileged environment identifiers/configured secret values, and hidden-metric identifiers absent.`);
