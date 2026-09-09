"use client";

import { useState, useTransition } from "react";
import { createChallengeAction } from "@/app/challenges/actions";
import type { ChallengeZoneOption } from "@/lib/challenges";

interface ChallengeFormProps {
  zones: ChallengeZoneOption[];
}

export function ChallengeForm({ zones }: ChallengeFormProps) {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [targetKg, setTargetKg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && zoneId && startsAt && endsAt && Number(targetKg) > 0;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await createChallengeAction({
          name: name.trim(),
          zoneId,
          startsAt: new Date(`${startsAt}T00:00:00`).toISOString(),
          endsAt: new Date(`${endsAt}T23:59:59`).toISOString(),
          targetKg: Number(targetKg),
        });
        setName("");
        setStartsAt("");
        setEndsAt("");
        setTargetKg("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create challenge");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">New challenge</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm sm:col-span-2 dark:border-zinc-700 dark:bg-black"
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
        <input
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <input
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min="1"
          value={targetKg}
          onChange={(e) => setTargetKg(e.target.value)}
          placeholder="Target kg"
          className="w-32 rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <button
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="rounded-full bg-[#3ea35f] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Create"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
