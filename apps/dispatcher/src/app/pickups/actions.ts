"use server";

import { revalidatePath } from "next/cache";
import { assignAgentToPickup, unassignPickup } from "@/lib/pickups";

export async function assignAgentAction(pickupId: string, agentId: string) {
  await assignAgentToPickup(pickupId, agentId);
  revalidatePath("/pickups");
  revalidatePath("/");
}

export async function unassignAction(pickupId: string) {
  await unassignPickup(pickupId);
  revalidatePath("/pickups");
  revalidatePath("/");
}
