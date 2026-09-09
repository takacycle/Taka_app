import { listActiveAgentLocations } from "@/lib/agents";
import { LiveMap } from "@/components/live-map";

function formatAge(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

export default async function LiveMapPage() {
  const agents = await listActiveAgentLocations();

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Live Map</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          {agents.length} agent{agents.length === 1 ? "" : "s"} reporting live location right now.
        </p>
      </div>

      <div className="flex flex-1 gap-4">
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          {agents.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No agents currently reporting location — this only shows while an agent has an active pickup open in
              the app.
            </p>
          )}
          {agents.map((agent) => (
            <div key={agent.id} className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{agent.fullName}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {agent.currentPickupAddress ?? "No active pickup"}
              </p>
              <p className="text-xs text-zinc-400">Updated {formatAge(agent.locationUpdatedAt)}</p>
            </div>
          ))}
        </div>

        <div className="min-h-[500px] flex-1 overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
          <LiveMap agents={agents} />
        </div>
      </div>
    </div>
  );
}
