"use client";

import { useState, useTransition } from "react";
import { resolveSupportTicketAction } from "@/app/support/actions";

interface SupportActionsProps {
  ticketId: string;
}

export function SupportActions({ ticketId }: SupportActionsProps) {
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolve() {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await resolveSupportTicketAction(ticketId, note.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to resolve ticket");
      }
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Response to send the filer (required to resolve)"
        rows={2}
        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={resolve}
        disabled={isPending || !note.trim()}
        className="rounded-full bg-[#3ea35f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "…" : "Resolve"}
      </button>
    </div>
  );
}
