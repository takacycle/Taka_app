"use client";

import { useState, useTransition } from "react";
import { submitQualityAuditAction } from "@/app/audits/actions";

interface AuditActionsProps {
  pickupEvidenceId: string;
  pickupId: string;
  agentId: string | null;
}

export function AuditActions({ pickupEvidenceId, pickupId, agentId }: AuditActionsProps) {
  const [notes, setNotes] = useState("");
  const [confirmingMismatch, setConfirmingMismatch] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(result: "confirmed" | "mismatch") {
    setError(null);
    startTransition(async () => {
      try {
        await submitQualityAuditAction({
          pickupEvidenceId,
          pickupId,
          agentId,
          result,
          notes: notes.trim() || null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit audit");
        setConfirmingMismatch(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {confirmingMismatch ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Opens a fraud review — sure?</span>
          <button
            onClick={() => submit("mismatch")}
            disabled={isPending}
            className="rounded-full bg-[#ff3535] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Yes, flag it"}
          </button>
          <button
            onClick={() => setConfirmingMismatch(false)}
            disabled={isPending}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => submit("confirmed")}
            disabled={isPending}
            className="rounded-full bg-[#3ea35f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Confirm match"}
          </button>
          <button
            onClick={() => setConfirmingMismatch(true)}
            disabled={isPending}
            className="rounded-full bg-[rgba(255,53,53,0.1)] px-3 py-1.5 text-sm font-medium text-[#ff3535] disabled:opacity-50"
          >
            Flag mismatch
          </button>
        </div>
      )}
    </div>
  );
}
