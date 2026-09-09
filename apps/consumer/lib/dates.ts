export interface PickupDateOption {
  date: Date;
  isoDate: string; // YYYY-MM-DD, local calendar date
  weekdayLabel: string; // "Thu"
  dayOfMonth: number;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Next `count` calendar dates that fall on one of `pickupDays` (ISO weekday:
 * 1=Monday .. 7=Sunday), starting no earlier than `minNoticeHours` from now.
 */
export function nextPickupDates(pickupDays: number[], count: number, minNoticeHours = 24): PickupDateOption[] {
  if (pickupDays.length === 0) return [];

  const results: PickupDateOption[] = [];
  const start = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60 && results.length < count; i++) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + i);
    const isoWeekday = ((candidate.getDay() + 6) % 7) + 1; // JS: 0=Sun..6=Sat -> ISO: 1=Mon..7=Sun

    if (pickupDays.includes(isoWeekday)) {
      results.push({
        date: candidate,
        isoDate: toIsoDate(candidate),
        weekdayLabel: candidate.toLocaleDateString("en-US", { weekday: "short" }),
        dayOfMonth: candidate.getDate(),
      });
    }
  }

  return results;
}
