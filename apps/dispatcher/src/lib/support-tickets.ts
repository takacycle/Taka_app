import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/push";

export interface OpenSupportTicket {
  id: string;
  category: string;
  description: string;
  pickupId: string | null;
  createdAt: string;
  filedByType: "consumer" | "agent";
  filedByName: string;
}

export async function listOpenSupportTickets(): Promise<OpenSupportTicket[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, category, description, pickup_id, created_at, consumer_id, agent_id, app_users(full_name), agents(full_name)")
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const consumer = Array.isArray(row.app_users) ? row.app_users[0] : row.app_users;
    const agent = Array.isArray(row.agents) ? row.agents[0] : row.agents;
    const filedByType: "consumer" | "agent" = row.consumer_id ? "consumer" : "agent";

    return {
      id: row.id,
      category: row.category,
      description: row.description,
      pickupId: row.pickup_id,
      createdAt: row.created_at,
      filedByType,
      filedByName: (filedByType === "consumer" ? consumer?.full_name : agent?.full_name) ?? "Unknown",
    };
  });
}

// Resolving is service-role-only — support_tickets has no UPDATE policy for
// authenticated at all (only self-service INSERT+SELECT), so a filer can see their
// own ticket's status but never edit it themselves.
export async function resolveSupportTicket(ticketId: string, resolutionNote: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("consumer_id, agent_id, app_users(expo_push_token), agents(expo_push_token)")
    .eq("id", ticketId)
    .maybeSingle();
  if (ticketError) throw ticketError;
  if (!ticket) throw new Error("Support ticket not found");

  const { error: updateError } = await supabase
    .from("support_tickets")
    .update({ resolved_at: new Date().toISOString(), resolution_note: resolutionNote })
    .eq("id", ticketId);
  if (updateError) throw updateError;

  const consumer = Array.isArray(ticket.app_users) ? ticket.app_users[0] : ticket.app_users;
  const agent = Array.isArray(ticket.agents) ? ticket.agents[0] : ticket.agents;
  const token = (ticket.consumer_id ? consumer?.expo_push_token : agent?.expo_push_token) ?? null;
  await sendPushNotification(token, "Your support ticket was resolved", resolutionNote);
}
