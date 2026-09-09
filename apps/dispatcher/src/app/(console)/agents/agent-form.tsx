"use client";

import { useState, useTransition } from "react";
import { createAgentAction } from "@/app/agents/actions";
import type { AgentZoneOption } from "@/lib/agents";

const PHONE_PATTERN = /^\+\d{9,15}$/;

interface AgentFormProps {
  zones: AgentZoneOption[];
}

export function AgentForm({ zones }: AgentFormProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+233");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim() && PHONE_PATTERN.test(phone.trim()) && zoneId;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await createAgentAction({ fullName: fullName.trim(), phone: phone.trim(), zoneId });
        setFullName("");
        setPhone("+233");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create agent");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">New agent</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-black"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+233241234567"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="rounded-full bg-[#3ea35f] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Create agent"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
