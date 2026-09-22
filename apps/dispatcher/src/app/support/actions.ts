"use server";

import { revalidatePath } from "next/cache";
import { resolveSupportTicket } from "@/lib/support-tickets";

export async function resolveSupportTicketAction(ticketId: string, resolutionNote: string) {
  await resolveSupportTicket(ticketId, resolutionNote);
  revalidatePath("/support");
}
