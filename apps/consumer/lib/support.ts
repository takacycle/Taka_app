import { supabase } from "./supabase";

export interface SupportTicket {
  id: string;
  category: string;
  description: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export async function createSupportTicket(input: { userId: string; category: string; description: string }): Promise<void> {
  const { error } = await supabase.from("support_tickets").insert({
    consumer_id: input.userId,
    category: input.category,
    description: input.description,
  });
  if (error) throw error;
}

export async function listMySupportTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, category, description, created_at, resolved_at, resolution_note")
    .eq("consumer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
  }));
}
