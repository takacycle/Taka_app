import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ConsumerRow {
  id: string;
  fullName: string;
  phone: string;
  zoneId: string | null;
  zoneName: string | null;
  createdAt: string;
  deletedAt: string | null;
  kgRecycled: number;
  pointsEarned: number;
  pickupCount: number;
  badgeTier: "bronze" | "silver" | "gold" | null;
}

const TIER_RANK: Record<string, number> = { bronze: 1, silver: 2, gold: 3 };

// Base list comes from app_users itself (not points_ledger, unlike getTopAgents in
// lib/analytics.ts) so a consumer with zero activity still shows up, just with
// zeroed-out stats.
export async function listConsumers(): Promise<ConsumerRow[]> {
  const supabase = createAdminClient();

  const [{ data: users, error: usersError }, { data: ledgerRows, error: ledgerError }, { data: badgeRows, error: badgeError }] =
    await Promise.all([
      supabase
        .from("app_users")
        .select("id, full_name, phone, zone_id, created_at, deleted_at, zones(name)")
        .order("full_name"),
      supabase.from("points_ledger").select("user_id, kg_verified, points_awarded"),
      supabase.from("badges").select("user_id, tier"),
    ]);
  if (usersError) throw usersError;
  if (ledgerError) throw ledgerError;
  if (badgeError) throw badgeError;

  const statsByUser = new Map<string, { kg: number; points: number; pickupCount: number }>();
  for (const row of ledgerRows ?? []) {
    const existing = statsByUser.get(row.user_id) ?? { kg: 0, points: 0, pickupCount: 0 };
    existing.kg += row.kg_verified;
    existing.points += row.points_awarded;
    existing.pickupCount += 1;
    statsByUser.set(row.user_id, existing);
  }

  const topTierByUser = new Map<string, string>();
  for (const row of badgeRows ?? []) {
    const current = topTierByUser.get(row.user_id);
    if (!current || TIER_RANK[row.tier] > TIER_RANK[current]) {
      topTierByUser.set(row.user_id, row.tier);
    }
  }

  return (users ?? []).map((row) => {
    const zone = Array.isArray(row.zones) ? row.zones[0] : row.zones;
    const stats = statsByUser.get(row.id) ?? { kg: 0, points: 0, pickupCount: 0 };
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      zoneId: row.zone_id,
      zoneName: zone?.name ?? null,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      kgRecycled: stats.kg,
      pointsEarned: stats.points,
      pickupCount: stats.pickupCount,
      badgeTier: (topTierByUser.get(row.id) as ConsumerRow["badgeTier"]) ?? null,
    };
  });
}
