import { listOpenFraudFlags } from "@/lib/fraud";
import { FraudActions } from "./fraud-actions";

const REASON_LABEL: Record<string, string> = {
  suspicious_pattern: "Suspicious pattern",
  audit_mismatch: "Audit mismatch",
  duplicate_evidence: "Duplicate evidence",
  manual_report: "Manually reported",
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

export default async function FraudPage() {
  const flags = await listOpenFraudFlags();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Fraud Review</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{flags.length} open flags awaiting a decision.</p>
      </div>

      <div className="space-y-3">
        {flags.map((flag) => (
          <div key={flag.id} className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[rgba(255,53,53,0.1)] px-2 py-0.5 text-xs font-medium text-[#ff3535]">
                  {REASON_LABEL[flag.reason] ?? flag.reason}
                </span>
                <span className="text-xs text-zinc-400">{formatDate(flag.createdAt)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{flag.requesterName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Agent: {flag.agentName ?? "unassigned"} · {flag.pointsAtStake} points at stake
              </p>
            </div>
            <FraudActions flagId={flag.id} agentName={flag.agentName} pointsAtStake={flag.pointsAtStake} />
          </div>
        ))}

        {flags.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No open fraud flags right now.</p>
        )}
      </div>
    </div>
  );
}
