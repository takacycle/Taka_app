import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AgentZoneOption {
  id: string;
  name: string;
}

export interface AgentRow {
  id: string;
  fullName: string;
  phone: string;
  zoneId: string;
  zoneName: string;
  reputationStatus: string;
  rejectionRate: number;
  createdAt: string;
}

export async function listAgentZones(): Promise<AgentZoneOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("zones").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listAgents(): Promise<AgentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, full_name, phone, zone_id, reputation_status, rejection_rate, created_at, zones(name)")
    .order("full_name");
  if (error) throw error;

  return (data ?? []).map((row) => {
    const zone = Array.isArray(row.zones) ? row.zones[0] : row.zones;
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      zoneId: row.zone_id,
      zoneName: zone?.name ?? "Unknown zone",
      reputationStatus: row.reputation_status,
      rejectionRate: row.rejection_rate,
      createdAt: row.created_at,
    };
  });
}

// The only path to changing this column — agents has no general UPDATE policy for
// `authenticated` by design (reputation is server-managed, see the init migration's
// comment on agents_select_own), so this always goes through the admin client.
export async function updateAgentStatus(agentId: string, status: "good_standing" | "suspended"): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("agents").update({ reputation_status: status }).eq("id", agentId);
  if (error) throw error;
}

// Agents are provisioned by dispatcher staff, never self-registered (see
// apps/agent/lib/auth-context.tsx's shouldCreateUser: false) — this is the only
// place that happens. Two writes are needed since nothing else creates either:
// an auth.users row (phone-confirmed, role: agent so handle_new_auth_user() skips
// the app_users insert) and a matching agents row.
export async function createAgent(input: { fullName: string; phone: string; zoneId: string }): Promise<void> {
  const supabase = createAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    phone: input.phone,
    phone_confirm: true,
    user_metadata: { role: "agent" },
  });
  if (createError) throw createError;

  const { error: insertError } = await supabase.from("agents").insert({
    id: created.user.id,
    full_name: input.fullName,
    phone: input.phone,
    zone_id: input.zoneId,
  });
  if (insertError) {
    // Roll back the auth user rather than leave an unprovisioned orphan — safe here
    // (unlike deleting a consumer) since a just-created agent has no history yet.
    await supabase.auth.admin.deleteUser(created.user.id);
    throw insertError;
  }
}

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
