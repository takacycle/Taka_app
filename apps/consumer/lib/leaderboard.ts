import { supabase } from "./supabase";

export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  totalKg: number;
  totalPoints: number;
  rank: number;
}

export type LeaderboardWindow = "all_time" | "this_week";

interface LeaderboardRpcRow {
  user_id: string;
  full_name: string;
  total_kg: number;
  total_points: number;
  rank: number;
}

function windowStart(window: LeaderboardWindow): string | null {
  if (window === "all_time") return null;
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return start.toISOString();
}

// Goes through the get_zone_leaderboard RPC — points_ledger RLS only allows a user
// to read their own rows, so a direct cross-user aggregate query isn't possible from
// the client (see the leaderboard-rpc migration for why this is a SECURITY DEFINER
// function instead of widened RLS).
export async function getZoneLeaderboard(zoneId: string, window: LeaderboardWindow): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_zone_leaderboard", {
    p_zone_id: zoneId,
    p_since: windowStart(window),
  });
  if (error) throw error;

  return ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
    userId: row.user_id,
    fullName: row.full_name,
    totalKg: row.total_kg,
    totalPoints: row.total_points,
    rank: row.rank,
  }));
}
