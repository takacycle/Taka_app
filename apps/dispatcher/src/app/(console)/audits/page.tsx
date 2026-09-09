import Image from "next/image";
import { listPendingAudits } from "@/lib/quality-audits";
import { AuditActions } from "./audit-actions";

const GRADE_LABEL: Record<string, string> = {
  clean_pet: "Clean PET",
  mixed_recyclables: "Mixed",
  contaminated: "Contaminated",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function QualityAuditsPage() {
  const audits = await listPendingAudits();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Quality Audits</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {audits.length} pickups randomly sampled for re-verification — confirm the agent&apos;s reported weight
          and grade against the evidence photo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {audits.map((audit) => (
          <div key={audit.pickupEvidenceId} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
            <div className="flex gap-4 p-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
                {audit.photoUrl ? (
                  <Image src={audit.photoUrl} alt="Evidence" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">No photo</div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-zinc-500">{formatDate(audit.capturedAt)}</p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{audit.requesterName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Verified by {audit.agentName ?? "unknown agent"}
                </p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {audit.scaleReadingKg}kg · {GRADE_LABEL[audit.materialGrade] ?? audit.materialGrade}
                </p>
              </div>
            </div>
            <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
              <AuditActions
                pickupEvidenceId={audit.pickupEvidenceId}
                pickupId={audit.pickupId}
                agentId={audit.agentId}
              />
            </div>
          </div>
        ))}

        {audits.length === 0 && (
          <p className="col-span-full py-10 text-center text-zinc-500 dark:text-zinc-400">
            No pickups pending audit right now.
          </p>
        )}
      </div>
    </div>
  );
}
