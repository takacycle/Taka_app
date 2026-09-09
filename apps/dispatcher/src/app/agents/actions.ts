"use server";

import { revalidatePath } from "next/cache";
import { createAgent, updateAgentStatus } from "@/lib/agents";

export async function createAgentAction(input: { fullName: string; phone: string; zoneId: string }) {
  await createAgent(input);
  revalidatePath("/agents");
}

export async function updateAgentStatusAction(agentId: string, status: "good_standing" | "suspended") {
  await updateAgentStatus(agentId, status);
  revalidatePath("/agents");
}
