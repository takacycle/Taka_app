import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ZoneRow {
  id: string;
  name: string;
  city: string;
  pickupDays: number[];
  createdAt: string;
}

export async function listZonesAdmin(): Promise<ZoneRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, city, pickup_days, created_at")
    .order("name");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    pickupDays: row.pickup_days,
    createdAt: row.created_at,
  }));
}

export async function createZone(input: { name: string; city: string; pickupDays: number[] }): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("zones").insert({
    name: input.name,
    city: input.city,
    pickup_days: input.pickupDays,
  });
  if (error) throw error;
}

export async function updateZonePickupDays(zoneId: string, pickupDays: number[]): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("zones").update({ pickup_days: pickupDays }).eq("id", zoneId);
  if (error) throw error;
}
