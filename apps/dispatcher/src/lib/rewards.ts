import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RewardRow {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string | null;
  imageKey: string | null;
  isActive: boolean;
}

export async function listRewards(): Promise<RewardRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rewards")
    .select("id, name, description, points_cost, category, image_key, is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    pointsCost: row.points_cost,
    category: row.category,
    imageKey: row.image_key,
    isActive: row.is_active,
  }));
}

export async function createReward(input: {
  name: string;
  description: string;
  pointsCost: number;
  category: string | null;
  imageKey: string | null;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("rewards").insert({
    name: input.name,
    description: input.description,
    points_cost: input.pointsCost,
    category: input.category,
    image_key: input.imageKey,
  });
  if (error) throw error;
}

// Rewards are deactivated, never deleted — redemptions.reward_id has no ON DELETE
// clause, so a reward that's ever been redeemed would foreign-key-violate on
// delete. Same reasoning as agents.reputation_status / app_users.deleted_at.
export async function updateRewardStatus(rewardId: string, isActive: boolean): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("rewards").update({ is_active: isActive }).eq("id", rewardId);
  if (error) throw error;
}
