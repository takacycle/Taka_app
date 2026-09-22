"use client";

import { useState, useTransition } from "react";
import { updateZonePickupDaysAction } from "@/app/zones/actions";
import { DayChips } from "./day-chips";

interface PickupDaysEditorProps {
  zoneId: string;
  pickupDays: number[];
}

function sameDays(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((day, i) => day === sortedB[i]);
}

export function PickupDaysEditor({ zoneId, pickupDays }: PickupDaysEditorProps) {
  const [selected, setSelected] = useState(pickupDays);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDirty = !sameDays(selected, pickupDays);

  function toggleDay(day: number) {
    setSelected((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateZonePickupDaysAction(zoneId, selected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update pickup days");
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <DayChips selected={selected} onToggle={toggleDay} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isDirty && (
        <button
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-[#3ea35f] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Save"}
        </button>
      )}
    </div>
  );
}
