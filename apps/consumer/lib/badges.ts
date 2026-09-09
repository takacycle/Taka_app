import { BADGE_THRESHOLD_KG, type BadgeTier } from "@takacycle/types";
import { supabase } from "./supabase";

export interface BadgeProgress {
  tier: BadgeTier;
  thresholdKg: number;
  earned: boolean;
  awardedAt: string | null;
}

const TIER_ORDER: BadgeTier[] = ["bronze", "silver", "gold"];

export async function getBadgeProgress(userId: string, lifetimeKg: number): Promise<BadgeProgress[]> {
  const { data, error } = await supabase.from("badges").select("tier, awarded_at").eq("user_id", userId);
  if (error) throw error;

  const awardedByTier = new Map((data ?? []).map((row) => [row.tier as BadgeTier, row.awarded_at as string]));

  return TIER_ORDER.map((tier) => ({
    tier,
    thresholdKg: BADGE_THRESHOLD_KG[tier],
    earned: awardedByTier.has(tier),
    awardedAt: awardedByTier.get(tier) ?? null,
  }));
}

export function nextBadge(progress: BadgeProgress[]): BadgeProgress | null {
  return progress.find((b) => !b.earned) ?? null;
}

export function currentTier(progress: BadgeProgress[]): BadgeTier | null {
  const earned = progress.filter((b) => b.earned);
  return earned.length > 0 ? earned[earned.length - 1].tier : null;
}
