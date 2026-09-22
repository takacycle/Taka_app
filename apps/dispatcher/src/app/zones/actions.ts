"use server";

import { revalidatePath } from "next/cache";
import { createZone, updateZonePickupDays } from "@/lib/zones";

export async function createZoneAction(input: { name: string; city: string; pickupDays: number[] }) {
  await createZone(input);
  revalidatePath("/zones");
}

export async function updateZonePickupDaysAction(zoneId: string, pickupDays: number[]) {
  await updateZonePickupDays(zoneId, pickupDays);
  revalidatePath("/zones");
}
