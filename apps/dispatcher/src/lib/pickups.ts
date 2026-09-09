import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export type QueuePickupStatus = "requested" | "assigned" | "en_route";

export interface QueuePickup {
  id: string;
  status: QueuePickupStatus;
  requestedAt: string;
  scheduledAt: string | null;
  addressText: string;
  notes: string | null;
  sackCount: number;
  zoneId: string;
  zoneName: string;
  requesterName: string;
  requesterPhone: string;
  agentName: string | null;
  lat: number | null;
  lng: number | null;
}

export interface AssignableAgent {
  id: string;
  fullName: string;
  phone: string;
  reputationStatus: string;
  rejectionRate: number;
  distanceKm: number | null;
}

// Haversine — good enough for "which agent is closest" sorting/display. Not a road
// distance (no routing API call involved, deliberately — see the original tech-stack
// plan on keeping the Directions/Distance Matrix key server-only and low-volume).
function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// The queue shows both unassigned requests (dispatcher needs to act) and
// already-assigned ones (dispatcher can undo a bad assignment) — matches the
// "Schedule"/Assign vs "Assigned"/Cancel pairing in the design.
export async function listQueuePickups(): Promise<QueuePickup[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pickups")
    .select(
      "id, status, requested_at, scheduled_at, address_text, notes, sack_count, zone_id, zones(name), app_users(full_name, phone), agents(full_name), pickup_lat, pickup_lng",
    )
    .in("status", ["requested", "assigned", "en_route"])
    .order("requested_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const zone = Array.isArray(row.zones) ? row.zones[0] : row.zones;
    const requester = Array.isArray(row.app_users) ? row.app_users[0] : row.app_users;
    const agent = Array.isArray(row.agents) ? row.agents[0] : row.agents;
    return {
      id: row.id,
      status: row.status as QueuePickupStatus,
      requestedAt: row.requested_at,
      scheduledAt: row.scheduled_at,
      addressText: row.address_text,
      notes: row.notes,
      sackCount: row.sack_count,
      zoneId: row.zone_id,
      zoneName: zone?.name ?? "Unknown zone",
      requesterName: requester?.full_name ?? "Unknown",
      requesterPhone: requester?.phone ?? "",
      agentName: agent?.full_name ?? null,
      lat: row.pickup_lat,
      lng: row.pickup_lng,
    };
  });
}

// Sorted nearest-first when the pickup's coordinates are known — agents who haven't
// reported a location recently (no active pickup open in their app) sort last with
// distanceKm: null rather than being excluded, since they're still assignable.
export async function listAssignableAgents(
  zoneId: string,
  pickupLat: number | null,
  pickupLng: number | null,
): Promise<AssignableAgent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, full_name, phone, reputation_status, rejection_rate, current_lat, current_lng")
    .eq("zone_id", zoneId)
    .neq("reputation_status", "suspended")
    .order("full_name");

  if (error) throw error;

  const agents = (data ?? []).map((row) => {
    const distanceKm =
      pickupLat != null && pickupLng != null && row.current_lat != null && row.current_lng != null
        ? haversineDistanceKm(pickupLat, pickupLng, row.current_lat, row.current_lng)
        : null;
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      reputationStatus: row.reputation_status,
      rejectionRate: row.rejection_rate,
      distanceKm,
    };
  });

  return agents.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

export async function assignAgentToPickup(pickupId: string, agentId: string): Promise<void> {
  const supabase = createAdminClient();

  // Re-check server-side even though the dropdown already excludes suspended agents
  // — the admin client bypasses RLS entirely, so this is the only thing standing
  // between a stale client and assigning a pickup to a suspended agent.
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("reputation_status, expo_push_token")
    .eq("id", agentId)
    .maybeSingle();
  if (agentError) throw agentError;
  if (!agent) throw new Error("Agent not found");
  if (agent.reputation_status === "suspended") throw new Error("This agent is suspended and can't be assigned pickups");

  const { data: pickup, error } = await supabase
    .from("pickups")
    .update({ agent_id: agentId, status: "assigned" })
    .eq("id", pickupId)
    .eq("status", "requested") // guard against double-assigning a pickup someone else already claimed
    .select("address_text")
    .maybeSingle();

  if (error) throw error;

  if (pickup) {
    await sendPushNotification(
      agent.expo_push_token,
      "New pickup assigned",
      `Pick up at ${pickup.address_text}`,
    );
  }
}

export async function unassignPickup(pickupId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pickups")
    .update({ agent_id: null, status: "requested" })
    .eq("id", pickupId);

  if (error) throw error;
}

export interface CompletedPickup {
  id: string;
  completedAt: string | null;
  addressText: string;
  zoneName: string;
  requesterName: string;
  agentName: string | null;
  scaleReadingKg: number | null;
  materialGrade: string | null;
  isAuditSample: boolean;
  pointsAwarded: number | null;
  photoUrl: string | null;
}

// pickup-evidence is a private Storage bucket (see the storage migration) — every
// photo needs a freshly signed URL to be viewable, there's no public path.
export async function listCompletedPickups(): Promise<CompletedPickup[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pickups")
    .select(
      "id, completed_at, address_text, zones(name), app_users(full_name), agents(full_name), pickup_evidence(photo_url, scale_reading_kg, material_grade, is_audit_sample), points_ledger(points_awarded)",
    )
    .eq("status", "verified")
    .order("completed_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = data ?? [];

  const photoPaths = rows
    .map((row) => {
      const evidence = Array.isArray(row.pickup_evidence) ? row.pickup_evidence[0] : row.pickup_evidence;
      return evidence?.photo_url;
    })
    .filter((path): path is string => !!path);

  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signedUrls, error: signError } = await supabase.storage
      .from("pickup-evidence")
      .createSignedUrls(photoPaths, 60 * 60);
    if (signError) throw signError;
    signedUrls?.forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(photoPaths[index], entry.signedUrl);
    });
  }

  return rows.map((row) => {
    const zone = Array.isArray(row.zones) ? row.zones[0] : row.zones;
    const requester = Array.isArray(row.app_users) ? row.app_users[0] : row.app_users;
    const agent = Array.isArray(row.agents) ? row.agents[0] : row.agents;
    const evidence = Array.isArray(row.pickup_evidence) ? row.pickup_evidence[0] : row.pickup_evidence;
    const ledger = Array.isArray(row.points_ledger) ? row.points_ledger[0] : row.points_ledger;

    return {
      id: row.id,
      completedAt: row.completed_at,
      addressText: row.address_text,
      zoneName: zone?.name ?? "Unknown zone",
      requesterName: requester?.full_name ?? "Unknown",
      agentName: agent?.full_name ?? null,
      scaleReadingKg: evidence?.scale_reading_kg ?? null,
      materialGrade: evidence?.material_grade ?? null,
      isAuditSample: evidence?.is_audit_sample ?? false,
      pointsAwarded: ledger?.points_awarded ?? null,
      photoUrl: evidence?.photo_url ? (signedUrlByPath.get(evidence.photo_url) ?? null) : null,
    };
  });
}
