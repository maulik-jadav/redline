import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type ServerDatabaseClient = SupabaseClient<Database>;

/** Privileged and lazy: never import into a browser barrel or build-time page. */
export function createServerSupabaseClient(): ServerDatabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase configuration is missing.");
  return createClient<Database>(url,key,{ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
