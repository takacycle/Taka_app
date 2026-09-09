import type { PickupStatus } from "@takacycle/types";
import { supabase } from "./supabase";

export interface MyPickup {
  id: string;
  status: PickupStatus;
  requestedAt: string;
  scheduledAt: string | null;
  addressText: string;
  sackCount: number;
  pointsAwarded: number | null;
  kgVerified: number | null;
  location: { lat: number; lng: number } | null;
}

const ACTIVE_STATUSES: PickupStatus[] = ["requested", "assigned", "en_route"];
const SELECT_FIELDS =
  "id, status, requested_at, scheduled_at, address_text, sack_count, pickup_lat, pickup_lng, points_ledger(points_awarded, kg_verified)";

function mapRow(row: {
  id: string;
  status: string;
  requested_at: string;
  scheduled_at: string | null;
  address_text: string;
  sack_count: number;
  pickup_lat: number | null;
  pickup_lng: number | null;
  points_ledger: { points_awarded: number; kg_verified: number }[] | { points_awarded: number; kg_verified: number } | null;
}): MyPickup {
  const ledgerEntry = Array.isArray(row.points_ledger) ? row.points_ledger[0] : row.points_ledger;
  const hasCoords = row.pickup_lat != null && row.pickup_lng != null;
  return {
    id: row.id,
    status: row.status as PickupStatus,
    requestedAt: row.requested_at,
    scheduledAt: row.scheduled_at,
    addressText: row.address_text,
    sackCount: row.sack_count,
    pointsAwarded: ledgerEntry?.points_awarded ?? null,
    kgVerified: ledgerEntry?.kg_verified ?? null,
    location: hasCoords ? { lat: row.pickup_lat as number, lng: row.pickup_lng as number } : null,
  };
}

export async function listMyPickups(userId: string): Promise<MyPickup[]> {
  const { data, error } = await supabase
    .from("pickups")
    .select(SELECT_FIELDS)
    .eq("user_id", userId)
    .order("requested_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getMyPickup(pickupId: string): Promise<MyPickup | null> {
  const { data, error } = await supabase.from("pickups").select(SELECT_FIELDS).eq("id", pickupId).maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export function findUpcomingPickup(pickups: MyPickup[]): MyPickup | null {
  return pickups.find((p) => ACTIVE_STATUSES.includes(p.status)) ?? null;
}
