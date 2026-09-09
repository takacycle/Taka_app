import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

export interface CreateTakacycleSupabaseClientArgs {
  url: string;
  anonKey: string;
  /**
   * RN needs an AsyncStorage-backed adapter for session persistence; web/Next.js
   * can omit this and fall back to the library default.
   */
  auth?: SupabaseClientOptions<"public">["auth"];
}

export function createTakacycleSupabaseClient({
  url,
  anonKey,
  auth,
}: CreateTakacycleSupabaseClientArgs): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase url and anonKey are required to create a client.");
  }

  return createClient(url, anonKey, { auth });
}

export type { SupabaseClient, Session } from "@supabase/supabase-js";
