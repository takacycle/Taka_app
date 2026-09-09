import Link from "next/link";
import { getOverviewStats, getZoneBreakdown, getTopAgents } from "@/lib/analytics";

const REPUTATION_LABEL: Record<string, string> = {
  good_standing: "Good standing",
  flagged_for_review: "Flagged for review",
  suspended: "Suspended",
};

function StatCard({ href, value, label }: { href?: string; value: string | number; label: string }) {
  const content = (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <p className="text-3xl font-semibold text-black dark:text-zinc-50">{value}</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function OverviewPage() {
  const [stats, zoneBreakdown, topAgents] = await Promise.all([
    getOverviewStats(),
    getZoneBreakdown(),
    getTopAgents(),
  ]);

  const maxZoneKg = Math.max(1, ...zoneBreakdown.map((z) => z.kgCollected));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Overview</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Here&apos;s how Takacycle is moving today.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard href="/pickups" value={stats.pendingRequests} label="Pending requests" />
        <StatCard value={`${stats.totalKgCollected.toFixed(0)}kg`} label="Total kg collected" />
        <StatCard value={stats.totalPointsAwarded.toFixed(0)} label="Points awarded" />
        <StatCard href="/pickups/completed" value={stats.verifiedPickupCount} label="Verified pickups" />
        <StatCard value={stats.agentsGoodStanding} label="Agents in good standing" />
        <StatCard value={stats.agentsFlaggedForReview} label="Agents flagged for review" />
        <StatCard value={stats.agentsSuspended} label="Agents suspended" />
        <StatCard href="/fraud" value={stats.openFraudFlagCount} label="Open fraud flags" />
        <StatCard href="/audits" value={stats.pendingAuditCount} label="Pending audits" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Kg collected by zone</h2>
          <div className="space-y-3">
            {zoneBreakdown.map((zone) => (
              <div key={zone.zoneId}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{zone.zoneName}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {zone.kgCollected.toFixed(0)}kg · {zone.pickupCount} pickups
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#3ea35f]"
                    style={{ width: `${(zone.kgCollected / maxZoneKg) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {zoneBreakdown.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No verified pickups yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top agents by kg collected</h2>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {topAgents.map((agent, index) => (
              <div key={agent.agentId} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-zinc-400">{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{agent.fullName}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {REPUTATION_LABEL[agent.reputationStatus] ?? agent.reputationStatus}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{agent.kgCollected.toFixed(0)}kg</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{agent.pickupCount} pickups</p>
                </div>
              </div>
            ))}
            {topAgents.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No verified pickups yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
