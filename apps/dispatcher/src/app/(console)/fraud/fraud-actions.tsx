"use client";

import { useState, useTransition } from "react";
import { resolveFraudFlagAction } from "@/app/fraud/actions";

interface FraudActionsProps {
  flagId: string;
  agentName: string | null;
  pointsAtStake: number;
}

export function FraudActions({ flagId, agentName, pointsAtStake }: FraudActionsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve(action: "dismiss" | "confirm") {
    setError(null);
    startTransition(async () => {
      try {
        await resolveFraudFlagAction(flagId, action);
        setShowConfirm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve flag");
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => resolve("dismiss")}
          disabled={isPending}
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
        >
          Dismiss
        </button>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className="rounded-full bg-[#ff3535] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Confirm fraud
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="text-lg font-semibold text-black dark:text-zinc-50">Confirm fraud?</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This forfeits {pointsAtStake} points from this pickup (a reversing ledger entry, not a delete) and
              suspends {agentName ?? "the assigned agent"}&apos;s account. Not automatically reversible.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => resolve("confirm")}
                disabled={isPending}
                className="flex-1 rounded-full bg-[#ff3535] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending ? "…" : "Confirm fraud"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 rounded-full border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
