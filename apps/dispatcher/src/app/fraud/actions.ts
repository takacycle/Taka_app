"use server";

import { revalidatePath } from "next/cache";
import { resolveFraudFlag } from "@/lib/fraud";

export async function resolveFraudFlagAction(flagId: string, action: "dismiss" | "confirm") {
  await resolveFraudFlag(flagId, action);
  revalidatePath("/fraud");
  revalidatePath("/agents");
  revalidatePath("/pickups");
}
