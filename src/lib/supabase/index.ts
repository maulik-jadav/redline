// Browser-safe surface. Privileged repositories have a separate server-only barrel.
export { createBrowserSupabaseClient } from "./client";
export type { Database } from "./database.types";
