import { supabase } from "./supabase";

export interface Zone {
  id: string;
  name: string;
  city: string;
  pickupDays: number[]; // ISO weekday: 1=Monday .. 7=Sunday
}

function mapZone(row: { id: string; name: string; city: string; pickup_days: number[] }): Zone {
  return { id: row.id, name: row.name, city: row.city, pickupDays: row.pickup_days };
}

export async function listZones(): Promise<Zone[]> {
  const { data, error } = await supabase.from("zones").select("id, name, city, pickup_days").order("name");
  if (error) throw error;
  return (data ?? []).map(mapZone);
}

export async function getZone(zoneId: string): Promise<Zone | null> {
  const { data, error } = await supabase
    .from("zones")
    .select("id, name, city, pickup_days")
    .eq("id", zoneId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapZone(data) : null;
}
