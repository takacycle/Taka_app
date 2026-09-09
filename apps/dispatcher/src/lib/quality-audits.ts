import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PendingAudit {
  pickupEvidenceId: string;
  pickupId: string;
  scaleReadingKg: number;
  materialGrade: string;
  capturedAt: string;
  photoUrl: string | null;
  requesterName: string;
  agentId: string | null;
  agentName: string | null;
}

// pickup_evidence rows flagged is_audit_sample=true by verify-pickup's 10% random
// sample, that don't have a quality_audits row yet.
export async function listPendingAudits(): Promise<PendingAudit[]> {
  const supabase = createAdminClient();

  const [{ data: evidenceRows, error: evidenceError }, { data: auditedRows, error: auditedError }] =
    await Promise.all([
      supabase
        .from("pickup_evidence")
        .select(
          "id, pickup_id, scale_reading_kg, material_grade, photo_url, captured_at, pickups(user_id, agent_id, app_users(full_name), agents(id, full_name))",
        )
        .eq("is_audit_sample", true)
        .order("captured_at", { ascending: false }),
      supabase.from("quality_audits").select("pickup_evidence_id"),
    ]);

  if (evidenceError) throw evidenceError;
  if (auditedError) throw auditedError;

  const auditedIds = new Set((auditedRows ?? []).map((row) => row.pickup_evidence_id));
  const pending = (evidenceRows ?? []).filter((row) => !auditedIds.has(row.id));

  const photoPaths = pending.map((row) => row.photo_url).filter((p): p is string => !!p);
  const signedUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signedUrls, error: signError } = await supabase.storage
      .from("pickup-evidence")
      .createSignedUrls(photoPaths, 60 * 60);
    if (signError) throw signError;
    signedUrls?.forEach((entry, index) => {
      if (entry.signedUrl) signedUrlByPath.set(photoPaths[index], entry.signedUrl);
    });
  }

  return pending.map((row) => {
    const pickup = Array.isArray(row.pickups) ? row.pickups[0] : row.pickups;
    const requester = pickup ? (Array.isArray(pickup.app_users) ? pickup.app_users[0] : pickup.app_users) : null;
    const agent = pickup ? (Array.isArray(pickup.agents) ? pickup.agents[0] : pickup.agents) : null;

    return {
      pickupEvidenceId: row.id,
      pickupId: row.pickup_id,
      scaleReadingKg: row.scale_reading_kg,
      materialGrade: row.material_grade,
      capturedAt: row.captured_at,
      photoUrl: row.photo_url ? (signedUrlByPath.get(row.photo_url) ?? null) : null,
      requesterName: requester?.full_name ?? "Unknown",
      agentId: agent?.id ?? null,
      agentName: agent?.full_name ?? null,
    };
  });
}

// A "mismatch" result automatically opens a fraud flag — that's what actually
// populates the fraud queue; nothing else in the product creates one yet.
export async function submitQualityAudit(input: {
  pickupEvidenceId: string;
  pickupId: string;
  agentId: string | null;
  result: "confirmed" | "mismatch";
  notes: string | null;
}): Promise<void> {
  const supabase = createAdminClient();

  const { error: auditError } = await supabase.from("quality_audits").insert({
    pickup_evidence_id: input.pickupEvidenceId,
    result: input.result,
    notes: input.notes,
  });
  if (auditError) throw auditError;

  if (input.result === "mismatch") {
    const { error: flagError } = await supabase.from("fraud_flags").insert({
      pickup_id: input.pickupId,
      agent_id: input.agentId,
      reason: "audit_mismatch",
    });
    if (flagError) throw flagError;
  }
}
