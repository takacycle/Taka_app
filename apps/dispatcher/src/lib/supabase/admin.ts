import "server-only";
import { createTakacycleSupabaseClient } from "@takacycle/supabase-client";

/**
 * Bypasses Row Level Security using the Supabase secret key — for privileged
 * server-only operations (e.g. provisioning an agent account). Never import
 * this from a Client Component; the `server-only` import throws if you try.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY — check apps/dispatcher/.env");
  }

  return createTakacycleSupabaseClient({
    url,
    anonKey: secretKey,
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
