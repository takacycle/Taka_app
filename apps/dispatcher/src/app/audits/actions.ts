"use server";

import { revalidatePath } from "next/cache";
import { submitQualityAudit } from "@/lib/quality-audits";

export async function submitQualityAuditAction(input: {
  pickupEvidenceId: string;
  pickupId: string;
  agentId: string | null;
  result: "confirmed" | "mismatch";
  notes: string | null;
}) {
  await submitQualityAudit(input);
  revalidatePath("/audits");
  revalidatePath("/fraud");
}
