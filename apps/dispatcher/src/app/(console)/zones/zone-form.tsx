"use client";

import { useState, useTransition } from "react";
import { createZoneAction } from "@/app/zones/actions";
import { DayChips } from "./day-chips";

export function ZoneForm() {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [pickupDays, setPickupDays] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && city.trim();

  function toggleDay(day: number) {
    setPickupDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  }

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        await createZoneAction({ name: name.trim(), city: city.trim(), pickupDays });
        setName("");
        setCity("");
        setPickupDays([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create zone");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">New zone</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zone name"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        />
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-zinc-500 dark:text-zinc-400">Pickup days</p>
        <DayChips selected={pickupDays} onToggle={toggleDay} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={isPending || !canSubmit}
          className="rounded-full bg-[#3ea35f] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Create zone"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
