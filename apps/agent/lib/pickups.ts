import type { MaterialGrade } from "@takacycle/types";
import { supabase } from "./supabase";

export type AssignedPickupStatus = "assigned" | "en_route";

export interface AssignedPickup {
  id: string;
  status: AssignedPickupStatus;
  scheduledAt: string | null;
  addressText: string;
  notes: string | null;
  sackCount: number;
  requesterName: string;
  requesterPhone: string;
  location: { lat: number; lng: number } | null;
}

function mapRow(row: {
  id: string;
  status: string;
  scheduled_at: string | null;
  address_text: string;
  notes: string | null;
  sack_count: number;
  app_users: { full_name: string; phone: string }[] | { full_name: string; phone: string } | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
}): AssignedPickup {
  const requester = Array.isArray(row.app_users) ? row.app_users[0] : row.app_users;
  const hasCoords = row.pickup_lat != null && row.pickup_lng != null;
  return {
    id: row.id,
    status: row.status as AssignedPickupStatus,
    scheduledAt: row.scheduled_at,
    addressText: row.address_text,
    notes: row.notes,
    sackCount: row.sack_count,
    requesterName: requester?.full_name ?? "Unknown",
    requesterPhone: requester?.phone ?? "",
    location: hasCoords ? { lat: row.pickup_lat as number, lng: row.pickup_lng as number } : null,
  };
}

export async function listAssignedPickups(agentId: string): Promise<AssignedPickup[]> {
  const { data, error } = await supabase
    .from("pickups")
    .select("id, status, scheduled_at, address_text, notes, sack_count, app_users(full_name, phone)")
    .eq("agent_id", agentId)
    .in("status", ["assigned", "en_route"])
    .order("scheduled_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getAssignedPickup(pickupId: string): Promise<AssignedPickup | null> {
  const { data, error } = await supabase
    .from("pickups")
    .select("id, status, scheduled_at, address_text, notes, sack_count, app_users(full_name, phone), pickup_lat, pickup_lng")
    .eq("id", pickupId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function markPickupEnRoute(pickupId: string): Promise<void> {
  const { error } = await supabase.from("pickups").update({ status: "en_route" }).eq("id", pickupId);
  if (error) throw error;
}

// Location is the only column agents can self-update (see the RLS + column-grant in
// the live-location migration) — everything else on the agents row is admin-only.
export async function reportAgentLocation(agentId: string, coords: { lat: number; lng: number }): Promise<void> {
  const { error } = await supabase
    .from("agents")
    .update({
      current_location: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", agentId);
  if (error) throw error;
}

export interface SubmitVerificationInput {
  pickupId: string;
  photoUri: string;
  scaleReadingKg: number;
  materialGrade: MaterialGrade;
  gps: { lat: number; lng: number };
}

export interface SubmitVerificationResult {
  pointsAwarded: number;
  isAuditSample: boolean;
}

export async function submitPickupVerification(input: SubmitVerificationInput): Promise<SubmitVerificationResult> {
  const photoResponse = await fetch(input.photoUri);
  const photoBlob = await photoResponse.blob();
  const photoPath = `${input.pickupId}/${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("pickup-evidence")
    .upload(photoPath, photoBlob, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.functions.invoke("verify-pickup", {
    body: {
      pickupId: input.pickupId,
      scaleReadingKg: input.scaleReadingKg,
      materialGrade: input.materialGrade,
      photoPath,
      gpsLat: input.gps.lat,
      gpsLng: input.gps.lng,
    },
  });

  if (error) throw error;
  return data as SubmitVerificationResult;
}
