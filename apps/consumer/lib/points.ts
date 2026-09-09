import { supabase } from "./supabase";

export interface PointsSummary {
  totalEarned: number;
  totalRedeemed: number;
  balance: number;
  kgRecycled: number;
  verifiedPickupCount: number;
}

export async function getPointsSummary(userId: string): Promise<PointsSummary> {
  const [ledgerResult, redemptionsResult] = await Promise.all([
    supabase.from("points_ledger").select("points_awarded, kg_verified, pickup_id").eq("user_id", userId),
    supabase.from("redemptions").select("points_spent").eq("user_id", userId),
  ]);

  if (ledgerResult.error) throw ledgerResult.error;
  if (redemptionsResult.error) throw redemptionsResult.error;

  const ledger = ledgerResult.data ?? [];
  const totalEarned = ledger.reduce((sum, row) => sum + row.points_awarded, 0);
  const kgRecycled = ledger.reduce((sum, row) => sum + row.kg_verified, 0);
  const totalRedeemed = (redemptionsResult.data ?? []).reduce((sum, row) => sum + row.points_spent, 0);
  // Distinct pickups, not ledger rows — a confirmed-fraud forfeiture inserts a second
  // (negative) row against the same pickup_id, which shouldn't double-count it.
  const verifiedPickupCount = new Set(ledger.map((row) => row.pickup_id)).size;

  return {
    totalEarned,
    totalRedeemed,
    balance: totalEarned - totalRedeemed,
    kgRecycled,
    verifiedPickupCount,
  };
}
