import { supabase } from "./supabase";

// Always pickup-scoped -- this is the only support entry point in the agent app
// today (the pickup detail screen's "Report an Issue" button) -- so there's no
// category picker, just a fixed category.
export async function createSupportTicket(input: { agentId: string; pickupId: string; description: string }): Promise<void> {
  const { error } = await supabase.from("support_tickets").insert({
    agent_id: input.agentId,
    pickup_id: input.pickupId,
    category: "pickup_issue",
    description: input.description,
  });
  if (error) throw error;
}
