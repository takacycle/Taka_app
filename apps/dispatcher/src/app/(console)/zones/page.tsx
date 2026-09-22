import { listZonesAdmin } from "@/lib/zones";
import { ZoneForm } from "./zone-form";
import { PickupDaysEditor } from "./pickup-days-editor";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ZonesPage() {
  const zones = await listZonesAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Zones</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Service areas agents, consumers, and challenges are scoped to.
        </p>
      </div>

      <ZoneForm />

      <div className="space-y-3">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{zone.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {zone.city} · Created {formatDate(zone.createdAt)}
              </p>
            </div>
            <PickupDaysEditor zoneId={zone.id} pickupDays={zone.pickupDays} />
          </div>
        ))}

        {zones.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No zones yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
