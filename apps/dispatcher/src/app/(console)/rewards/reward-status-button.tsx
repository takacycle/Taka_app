"use client";

import { useState, useTransition } from "react";
import { updateRewardStatusAction } from "@/app/rewards/actions";

interface RewardStatusButtonProps {
  rewardId: string;
  isActive: boolean;
}

export function RewardStatusButton({ rewardId, isActive }: RewardStatusButtonProps) {
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(nextActive: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await updateRewardStatusAction(rewardId, nextActive);
        setConfirmingDeactivate(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update reward");
      }
    });
  }

  if (!isActive) {
    return (
      <div className="space-y-1 text-right">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={() => apply(true)}
          disabled={isPending}
          className="rounded-full bg-[#3ea35f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Reactivate"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-right">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {confirmingDeactivate ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-zinc-500">Sure?</span>
          <button
            onClick={() => apply(false)}
            disabled={isPending}
            className="rounded-full bg-[#ff3535] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Yes, deactivate"}
          </button>
          <button
            onClick={() => setConfirmingDeactivate(false)}
            disabled={isPending}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDeactivate(true)}
          disabled={isPending}
          className="rounded-full bg-[rgba(255,53,53,0.1)] px-3 py-1.5 text-sm font-medium text-[#ff3535] disabled:opacity-50"
        >
          Deactivate
        </button>
      )}
    </div>
  );
}
