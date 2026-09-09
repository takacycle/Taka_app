"use server";

import { revalidatePath } from "next/cache";
import { createChallenge } from "@/lib/challenges";

export async function createChallengeAction(input: {
  name: string;
  zoneId: string;
  startsAt: string;
  endsAt: string;
  targetKg: number;
}) {
  await createChallenge(input);
  revalidatePath("/challenges");
}
