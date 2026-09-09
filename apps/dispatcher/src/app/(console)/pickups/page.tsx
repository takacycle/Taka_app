import { listQueuePickups, listAssignableAgents, type AssignableAgent } from "@/lib/pickups";
import { PickupActions } from "./pickup-actions";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function PickupQueuePage() {
  const pickups = await listQueuePickups();

  // Fetched per pickup, not cached per zone — distance-to-agent depends on this
  // specific pickup's coordinates, not just which zone it's in.
  const agentsByPickup: Record<string, AssignableAgent[]> = {};
  await Promise.all(
    pickups.map(async (pickup) => {
      agentsByPickup[pickup.id] = await listAssignableAgents(pickup.zoneId, pickup.lat, pickup.lng);
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Pickup Queue</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{pickups.length} pickups awaiting or in assignment</p>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Zone</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Sacks</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {pickups.map((pickup) => (
              <tr key={pickup.id} className="border-b border-zinc-50 last:border-0 dark:border-zinc-800">
                <td className="px-4 py-3 font-mono text-xs uppercase text-zinc-700 dark:text-zinc-300">
                  {pickup.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{pickup.requesterName}</td>
                <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{pickup.zoneName}</td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{formatDate(pickup.scheduledAt)}</td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{pickup.sackCount}</td>
                <td className="px-4 py-3">
                  {pickup.status === "requested" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,102,255,0.1)] px-2 py-1 text-xs font-medium text-[#005be4]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#005be4]" /> Schedule
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(110,255,158,0.1)] px-2 py-1 text-xs font-medium text-[#3ea35f]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3ea35f]" /> Assigned
                      {pickup.agentName ? ` · ${pickup.agentName}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <PickupActions pickupId={pickup.id} status={pickup.status} agents={agentsByPickup[pickup.id] ?? []} />
                </td>
              </tr>
            ))}
            {pickups.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No pickups in the queue right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
