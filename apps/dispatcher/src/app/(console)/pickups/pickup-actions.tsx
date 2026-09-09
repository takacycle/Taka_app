"use client";

import { useState, useTransition } from "react";
import { assignAgentAction, unassignAction } from "@/app/pickups/actions";
import type { AssignableAgent, QueuePickupStatus } from "@/lib/pickups";

interface PickupActionsProps {
  pickupId: string;
  status: QueuePickupStatus;
  agents: AssignableAgent[];
}

function agentLabel(agent: AssignableAgent): string {
  if (agent.distanceKm == null) return `${agent.fullName} — location unknown`;
  return `${agent.fullName} — ${agent.distanceKm.toFixed(1)} km away`;
}

export function PickupActions({ pickupId, status, agents }: PickupActionsProps) {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status !== "requested") {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await unassignAction(pickupId);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to cancel");
              }
            });
          }}
          disabled={isPending}
          className="rounded-full bg-[rgba(255,146,146,0.1)] px-3 py-1.5 text-sm font-medium text-[#ff3535] disabled:opacity-50"
        >
          {isPending ? "…" : "Cancel"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  // Agents are already sorted nearest-first by listAssignableAgents.
  const nearest = agents.find((a) => a.distanceKm != null);

  function assign(agentId: string) {
    if (!agentId) return;
    setError(null);
    startTransition(async () => {
      try {
        await assignAgentAction(pickupId, agentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to assign");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          disabled={isPending || agents.length === 0}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-black"
        >
          <option value="">{agents.length === 0 ? "No agents in zone" : "Select agent"}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agentLabel(agent)}
            </option>
          ))}
        </select>
        <button
          onClick={() => assign(selectedAgentId)}
          disabled={isPending || !selectedAgentId}
          className="rounded-full bg-[#3ea35f] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "…" : "Assign"}
        </button>
      </div>
      {nearest && (
        <button
          onClick={() => assign(nearest.id)}
          disabled={isPending}
          className="text-xs font-medium text-[#3ea35f] underline-offset-2 hover:underline disabled:opacity-50"
        >
          Assign nearest ({nearest.fullName}, {nearest.distanceKm!.toFixed(1)} km)
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
