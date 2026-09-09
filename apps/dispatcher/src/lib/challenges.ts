import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ChallengeZoneOption {
  id: string;
  name: string;
}

export interface ChallengeRow {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  startsAt: string;
  endsAt: string;
  targetKg: number;
  progressKg: number;
  isActive: boolean;
}

export async function listChallengeZones(): Promise<ChallengeZoneOption[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("zones").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

// Progress is computed with the admin client (bypasses RLS) rather than the
// get_challenge_progress RPC — that RPC exists for the consumer app, which is bound
// by RLS and can't aggregate other users' points_ledger rows directly.
export async function listChallenges(): Promise<ChallengeRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, name, zone_id, starts_at, ends_at, target_kg, zones(name)")
    .order("starts_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  const now = new Date();

  const progressByChallenge = await Promise.all(
    rows.map(async (row) => {
      const { data: ledgerRows, error: ledgerError } = await supabase
        .from("points_ledger")
        .select("kg_verified, app_users!inner(zone_id)")
        .eq("app_users.zone_id", row.zone_id)
        .gte("created_at", row.starts_at)
        .lte("created_at", row.ends_at);
      if (ledgerError) throw ledgerError;
      return (ledgerRows ?? []).reduce((sum, entry) => sum + entry.kg_verified, 0);
    }),
  );

  return rows.map((row, index) => {
    const zone = Array.isArray(row.zones) ? row.zones[0] : row.zones;
    return {
      id: row.id,
      name: row.name,
      zoneId: row.zone_id,
      zoneName: zone?.name ?? "Unknown zone",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      targetKg: row.target_kg,
      progressKg: progressByChallenge[index],
      isActive: new Date(row.starts_at) <= now && now <= new Date(row.ends_at),
    };
  });
}

export async function createChallenge(input: {
  name: string;
  zoneId: string;
  startsAt: string;
  endsAt: string;
  targetKg: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("challenges").insert({
    name: input.name,
    zone_id: input.zoneId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    target_kg: input.targetKg,
  });
  if (error) throw error;
}
