import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActiveAgentLocation {
  id: string;
  fullName: string;
  lat: number;
  lng: number;
  locationUpdatedAt: string;
  currentPickupAddress: string | null;
}

// Only agents who've reported a position in the last 30 minutes — an older point
// is stale enough that showing it as "live" would be misleading.
const STALE_AFTER_MINUTES = 30;

export async function listActiveAgentLocations(): Promise<ActiveAgentLocation[]> {
  const supabase = createAdminClient();
  const staleCutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("agents")
    .select(
      "id, full_name, current_lat, current_lng, location_updated_at, pickups!pickups_agent_id_fkey(address_text, status)",
    )
    .not("current_lat", "is", null)
    .gte("location_updated_at", staleCutoff);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      if (row.current_lat == null || row.current_lng == null) return null;

      const pickups = Array.isArray(row.pickups) ? row.pickups : row.pickups ? [row.pickups] : [];
      const activePickup = pickups.find((p) => p.status === "assigned" || p.status === "en_route");

      return {
        id: row.id,
        fullName: row.full_name,
        lat: row.current_lat,
        lng: row.current_lng,
        locationUpdatedAt: row.location_updated_at as string,
        currentPickupAddress: activePickup?.address_text ?? null,
      };
    })
    .filter((row): row is ActiveAgentLocation => row !== null);
}
