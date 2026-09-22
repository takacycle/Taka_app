"use client";

// zones.pickup_days is ISO weekday numbers (1=Monday .. 7=Sunday) -- see the
// column comment in supabase/migrations/20260822135811_request_pickup_fields.sql.
export const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

interface DayChipsProps {
  selected: number[];
  onToggle: (day: number) => void;
}

export function DayChips({ selected, onToggle }: DayChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map((day) => {
        const isSelected = selected.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            onClick={() => onToggle(day.value)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              isSelected
                ? "bg-[#3ea35f] text-white"
                : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            }`}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
