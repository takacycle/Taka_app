// Called directly by the agent app after it captures a photo, weight, and quality
// grade for a pickup. Runs with the service role so it can write points_ledger and
// pickup_evidence — no client role is allowed to write those directly (see the RLS
// policies in the init migration), which is what makes points unforgeable: the only
// way points get awarded is through this function, after weight + photo + GPS have
// actually been captured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// pointsAwarded = kg * BASE_POINTS_PER_KG * QUALITY_MULTIPLIER[grade], e.g. 10kg of
// Clean PET = 10 * 20 * 1.0 = 200 points. Keep this in sync with
// packages/types/src/index.ts (Edge Functions run on Deno and can't import from the
// monorepo's TS packages directly).
const QUALITY_MULTIPLIER: Record<string, number> = {
  clean_pet: 1.0,
  mixed_recyclables: 0.7,
  contaminated: 0.3,
};
const BASE_POINTS_PER_KG = 20;

// Lifetime kg thresholds for badges — keep in sync with packages/types/src/index.ts
// (BADGE_THRESHOLD_KG). Ordered lowest first so we can award every newly-crossed
// tier in one pass (e.g. a single huge pickup could cross bronze AND silver at once).
const BADGE_THRESHOLD_KG: { tier: "bronze" | "silver" | "gold"; kg: number }[] = [
  { tier: "bronze", kg: 50 },
  { tier: "silver", kg: 200 },
  { tier: "gold", kg: 500 },
];

interface VerifyPickupBody {
  pickupId: string;
  scaleReadingKg: number;
  materialGrade: "clean_pet" | "mixed_recyclables" | "contaminated";
  photoPath: string;
  gpsLat: number;
  gpsLng: number;
}

// The agent app also runs in a browser during development (Expo web preview),
// where CORS is enforced — a native client wouldn't need this.
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
  const agentId = userData.user.id;

  let body: VerifyPickupBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }

  const { pickupId, scaleReadingKg, materialGrade, photoPath, gpsLat, gpsLng } = body;
  if (!pickupId || !scaleReadingKg || !materialGrade || !photoPath || gpsLat == null || gpsLng == null) {
    return errorResponse(400, "Missing required fields");
  }
  if (!(materialGrade in QUALITY_MULTIPLIER)) {
    return errorResponse(400, "Invalid materialGrade");
  }
  if (scaleReadingKg <= 0) {
    return errorResponse(400, "scaleReadingKg must be positive");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Belt-and-suspenders alongside the RLS policy change in the suspension-enforcement
  // migration — this function runs as the service role, so it isn't subject to RLS
  // at all and needs its own explicit check.
  const { data: agent, error: agentError } = await admin
    .from("agents")
    .select("reputation_status")
    .eq("id", agentId)
    .maybeSingle();
  if (agentError || !agent) return errorResponse(403, "Agent not found");
  if (agent.reputation_status === "suspended") {
    return errorResponse(403, "Your account is suspended — contact your dispatcher.");
  }

  const { data: pickup, error: pickupError } = await admin
    .from("pickups")
    .select("id, user_id, agent_id, status")
    .eq("id", pickupId)
    .maybeSingle();

  if (pickupError || !pickup) return errorResponse(404, "Pickup not found");
  if (pickup.agent_id !== agentId) return errorResponse(403, "This pickup isn't assigned to you");
  if (pickup.status === "verified" || pickup.status === "cancelled") {
    return errorResponse(409, `Pickup already ${pickup.status}`);
  }

  // Design doc: "Random quality audits: 10% of pickups randomly selected for
  // re-verification."
  const isAuditSample = Math.random() < 0.1;

  const { error: evidenceError } = await admin.from("pickup_evidence").insert({
    pickup_id: pickupId,
    photo_url: photoPath,
    scale_reading_kg: scaleReadingKg,
    material_grade: materialGrade,
    gps_location: `SRID=4326;POINT(${gpsLng} ${gpsLat})`,
    is_audit_sample: isAuditSample,
  });
  if (evidenceError) return errorResponse(500, `Failed to record evidence: ${evidenceError.message}`);

  const multiplier = QUALITY_MULTIPLIER[materialGrade];
  const pointsAwarded = Math.round(scaleReadingKg * BASE_POINTS_PER_KG * multiplier);

  const { error: pointsError } = await admin.from("points_ledger").insert({
    user_id: pickup.user_id,
    pickup_id: pickupId,
    kg_verified: scaleReadingKg,
    multiplier,
    points_awarded: pointsAwarded,
  });
  if (pointsError) return errorResponse(500, `Failed to award points: ${pointsError.message}`);

  const { error: updateError } = await admin
    .from("pickups")
    .update({ status: "verified", completed_at: new Date().toISOString() })
    .eq("id", pickupId);
  if (updateError) return errorResponse(500, `Failed to update pickup status: ${updateError.message}`);

  const newlyAwardedBadges = await awardEligibleBadges(admin, pickup.user_id);

  return new Response(JSON.stringify({ pointsAwarded, isAuditSample, newlyAwardedBadges }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

// deno-lint-ignore no-explicit-any
async function awardEligibleBadges(admin: any, userId: string): Promise<string[]> {
  const [{ data: ledgerRows }, { data: existingBadges }] = await Promise.all([
    admin.from("points_ledger").select("kg_verified").eq("user_id", userId),
    admin.from("badges").select("tier").eq("user_id", userId),
  ]);

  const totalKg = (ledgerRows ?? []).reduce(
    (sum: number, row: { kg_verified: number }) => sum + row.kg_verified,
    0,
  );
  const alreadyEarned = new Set((existingBadges ?? []).map((b: { tier: string }) => b.tier));

  const toAward = BADGE_THRESHOLD_KG.filter((t) => totalKg >= t.kg && !alreadyEarned.has(t.tier));
  if (toAward.length === 0) return [];

  const { error } = await admin
    .from("badges")
    .insert(toAward.map((t) => ({ user_id: userId, tier: t.tier })));
  // A concurrent verification could race this on the (user_id, tier) unique
  // constraint — that's fine, it just means another request already awarded it.
  if (error && error.code !== "23505") {
    console.error("Failed to award badges:", error.message);
    return [];
  }

  return toAward.map((t) => t.tier);
}
