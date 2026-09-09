"use server";

import { revalidatePath } from "next/cache";
import { createReward, updateRewardStatus } from "@/lib/rewards";

export async function createRewardAction(input: {
  name: string;
  description: string;
  pointsCost: number;
  category: string | null;
  imageKey: string | null;
}) {
  await createReward(input);
  revalidatePath("/rewards");
}

export async function updateRewardStatusAction(rewardId: string, isActive: boolean) {
  await updateRewardStatus(rewardId, isActive);
  revalidatePath("/rewards");
}
