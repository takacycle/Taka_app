import { supabase } from "./supabase";

export interface AgentTrackingInfo {
  fullName: string;
  lat: number;
  lng: number;
  locationUpdatedAt: string;
}

// Agents have no general read policy for consumers — this goes through a narrow
// SECURITY DEFINER function that only returns the agent assigned to a pickup the
// caller actually owns (see the tracking-rpc migration).
export async function getPickupAgentLocation(pickupId: string): Promise<AgentTrackingInfo | null> {
  const { data, error } = await supabase.rpc("get_pickup_agent_location", { p_pickup_id: pickupId });
  if (error) throw error;

  const row = data?.[0];
  if (!row || row.agent_lat == null || row.agent_lng == null) return null;

  return {
    fullName: row.agent_full_name,
    lat: row.agent_lat,
    lng: row.agent_lng,
    locationUpdatedAt: row.location_updated_at,
  };
}
