import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/lib/audio/**/*.test.ts","src/lib/ai/**/*.test.ts", "src/lib/game/**/*.test.ts", "src/lib/game-server/**/*.test.ts", "src/lib/supabase/**/*.test.ts", "src/lib/rooms/**/*.test.ts", "src/lib/realtime/**/*.test.ts", "src/lib/briefing/**/*.test.ts", "supabase/tests/**/*.test.ts"] },
});
