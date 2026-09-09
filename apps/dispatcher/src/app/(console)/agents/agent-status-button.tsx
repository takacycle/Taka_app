"use client";

import { useState, useTransition } from "react";
import { updateAgentStatusAction } from "@/app/agents/actions";

interface AgentStatusButtonProps {
  agentId: string;
  reputationStatus: string;
}

export function AgentStatusButton({ agentId, reputationStatus }: AgentStatusButtonProps) {
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(status: "good_standing" | "suspended") {
    setError(null);
    startTransition(async () => {
      try {
        await updateAgentStatusAction(agentId, status);
        setConfirmingSuspend(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update agent");
      }
    });
  }

  if (reputationStatus === "suspended") {
    return (
      <div className="space-y-1 text-right">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={() => apply("good_standing")}
          disabled={isPending}
          className="rounded-full bg-[#3ea35f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Reinstate"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-right">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {confirmingSuspend ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-zinc-500">Sure?</span>
          <button
            onClick={() => apply("suspended")}
            disabled={isPending}
            className="rounded-full bg-[#ff3535] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "…" : "Yes, suspend"}
          </button>
          <button
            onClick={() => setConfirmingSuspend(false)}
            disabled={isPending}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingSuspend(true)}
          disabled={isPending}
          className="rounded-full bg-[rgba(255,53,53,0.1)] px-3 py-1.5 text-sm font-medium text-[#ff3535] disabled:opacity-50"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
