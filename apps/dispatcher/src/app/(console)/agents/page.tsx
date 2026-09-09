import { listAgents, listAgentZones } from "@/lib/agents";
import { AgentForm } from "./agent-form";
import { AgentStatusButton } from "./agent-status-button";

const REPUTATION_LABEL: Record<string, string> = {
  good_standing: "Good standing",
  flagged_for_review: "Flagged for review",
  suspended: "Suspended",
};

const REPUTATION_BADGE_CLASS: Record<string, string> = {
  good_standing: "bg-[rgba(62,163,95,0.1)] text-[#3ea35f]",
  flagged_for_review: "bg-[rgba(245,158,11,0.1)] text-[#b45309]",
  suspended: "bg-[rgba(255,53,53,0.1)] text-[#ff3535]",
};

export default async function AgentsPage() {
  const [agents, zones] = await Promise.all([listAgents(), listAgentZones()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Agents</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Provision new agents and manage the roster.</p>
      </div>

      <AgentForm zones={zones} />

      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{agent.fullName}</p>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${REPUTATION_BADGE_CLASS[agent.reputationStatus] ?? ""}`}
                >
                  {REPUTATION_LABEL[agent.reputationStatus] ?? agent.reputationStatus}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {agent.phone} · {agent.zoneName} · {(agent.rejectionRate * 100).toFixed(0)}% rejection rate
              </p>
            </div>

            <AgentStatusButton agentId={agent.id} reputationStatus={agent.reputationStatus} />
          </div>
        ))}

        {agents.length === 0 && (
          <p className="py-10 text-center text-zinc-500 dark:text-zinc-400">No agents yet — create one above.</p>
        )}
      </div>
    </div>
  );
}
