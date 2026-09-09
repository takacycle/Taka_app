import { supabase } from "./supabase";

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: string | null;
  imageKey: string | null;
}

export interface RedeemResult {
  redemptionId: string;
  newBalance: number;
}

export async function listActiveRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from("rewards")
    .select("id, name, description, points_cost, category, image_key")
    .eq("is_active", true)
    .order("points_cost", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    pointsCost: row.points_cost,
    category: row.category,
    imageKey: row.image_key,
  }));
}

export async function redeemReward(rewardId: string): Promise<RedeemResult> {
  const { data, error } = await supabase.functions.invoke("redeem-reward", {
    body: { rewardId },
  });
  if (error) throw error;

  return { redemptionId: data.redemption_id, newBalance: data.new_balance };
}
