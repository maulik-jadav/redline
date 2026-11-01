"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let transportInstance=0;
/** Public client only; the schema intentionally grants it no direct table access. */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Public Supabase configuration is missing.");
  return createClient<Database>(url,key,{ auth: { storageKey:`redline-transport-${++transportInstance}`, persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
