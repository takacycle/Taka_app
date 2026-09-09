// Called by the consumer app to delete its own account. Runs with the service role
// because it has to (a) scrub the caller's app_users row and (b) call the Auth Admin
// API to ban the underlying auth.users row — neither is possible from a client.
//
// This never calls admin.auth.admin.deleteUser(): app_users.id -> auth.users.id is
// ON DELETE CASCADE, but everything downstream of app_users (pickups, points_ledger,
// badges, redemptions) has no ON DELETE clause, so deleting a user with any pickup
// history would hit a foreign-key violation and roll back. Anonymizing in place and
// banning the auth user instead preserves that history (and the fraud/audit trail
// it exists for) while still satisfying "the account is gone" — no PII, can't log
// back in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function errorResponse(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return errorResponse(405, "Method not allowed");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return errorResponse(401, "Missing Authorization header");

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return errorResponse(401, "Invalid session");

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Anonymize first, then ban — if the ban call below fails, the account's PII is
  // already gone rather than the reverse (banned but still holding their data).
  const { error: updateError } = await admin
    .from("app_users")
    .update({
      full_name: "Deleted user",
      phone: "",
      organization_id: null,
      zone_id: null,
      expo_push_token: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", userData.user.id);
  if (updateError) return errorResponse(500, updateError.message);

  // No literal "permanent" ban duration exists — 876000h (100 years) is the
  // standard convention for one.
  const { error: banError } = await admin.auth.admin.updateUserById(userData.user.id, {
    ban_duration: "876000h",
  });
  if (banError) return errorResponse(500, banError.message);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
