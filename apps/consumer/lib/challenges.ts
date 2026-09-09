import { supabase } from "./supabase";

export interface ActiveChallenge {
  id: string;
  name: string;
  endsAt: string;
  targetKg: number;
  progressKg: number;
}

// points_ledger RLS only allows a user to read their own rows, so progress goes
// through the get_challenge_progress RPC — same reasoning as the zone leaderboard.
export async function getActiveChallenge(zoneId: string): Promise<ActiveChallenge | null> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("challenges")
    .select("id, name, ends_at, target_kg")
    .eq("zone_id", zoneId)
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: progressKg, error: progressError } = await supabase.rpc("get_challenge_progress", {
    p_challenge_id: data.id,
  });
  if (progressError) throw progressError;

  return {
    id: data.id,
    name: data.name,
    endsAt: data.ends_at,
    targetKg: data.target_kg,
    progressKg: progressKg ?? 0,
  };
}
