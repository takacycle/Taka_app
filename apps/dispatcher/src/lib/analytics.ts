import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OverviewStats {
  pendingRequests: number;
  totalKgCollected: number;
  totalPointsAwarded: number;
  verifiedPickupCount: number;
  agentsGoodStanding: number;
  agentsFlaggedForReview: number;
  agentsSuspended: number;
  openFraudFlagCount: number;
  pendingAuditCount: number;
}

export interface ZoneBreakdown {
  zoneId: string;
  zoneName: string;
  kgCollected: number;
  pickupCount: number;
}

export interface AgentPerformance {
  agentId: string;
  fullName: string;
  reputationStatus: string;
  kgCollected: number;
  pickupCount: number;
}

interface LedgerRow {
  kg_verified: number;
  points_awarded: number;
  pickups: {
    zone_id: string | null;
    agent_id: string | null;
    zones: { name: string } | { name: string }[] | null;
    agents: { id: string; full_name: string; reputation_status: string } | { id: string; full_name: string; reputation_status: string }[] | null;
  } | null;
}

// points_ledger includes negative reversal rows for confirmed-fraud pickups (see
// resolveFraudFlag) — summing kg_verified straight through nets those out, so zone
// and agent totals here reflect currently-credited kg, not gross-ever-scanned kg.
async function loadLedgerWithContext(): Promise<LedgerRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("points_ledger")
    .select(
      "kg_verified, points_awarded, pickups(zone_id, agent_id, zones(name), agents(id, full_name, reputation_status))",
    );
  if (error) throw error;
  return (data ?? []) as unknown as LedgerRow[];
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const supabase = createAdminClient();

  const [
    { count: pendingRequests },
    { count: verifiedPickupCount },
    { data: agentRows, error: agentError },
    { count: openFraudFlagCount },
    { data: auditSampleRows, error: auditSampleError },
    { data: auditedRows, error: auditedError },
    ledgerRows,
  ] = await Promise.all([
    supabase.from("pickups").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("pickups").select("id", { count: "exact", head: true }).eq("status", "verified"),
    supabase.from("agents").select("reputation_status"),
    supabase.from("fraud_flags").select("id", { count: "exact", head: true }).is("resolved_at", null),
    supabase.from("pickup_evidence").select("id").eq("is_audit_sample", true),
    supabase.from("quality_audits").select("pickup_evidence_id"),
    loadLedgerWithContext(),
  ]);

  if (agentError) throw agentError;
  if (auditSampleError) throw auditSampleError;
  if (auditedError) throw auditedError;

  const auditedIds = new Set((auditedRows ?? []).map((row) => row.pickup_evidence_id));
  const pendingAuditCount = (auditSampleRows ?? []).filter((row) => !auditedIds.has(row.id)).length;

  const agents = agentRows ?? [];

  return {
    pendingRequests: pendingRequests ?? 0,
    totalKgCollected: ledgerRows.reduce((sum, row) => sum + row.kg_verified, 0),
    totalPointsAwarded: ledgerRows.reduce((sum, row) => sum + row.points_awarded, 0),
    verifiedPickupCount: verifiedPickupCount ?? 0,
    agentsGoodStanding: agents.filter((a) => a.reputation_status === "good_standing").length,
    agentsFlaggedForReview: agents.filter((a) => a.reputation_status === "flagged_for_review").length,
    agentsSuspended: agents.filter((a) => a.reputation_status === "suspended").length,
    openFraudFlagCount: openFraudFlagCount ?? 0,
    pendingAuditCount,
  };
}

export async function getZoneBreakdown(): Promise<ZoneBreakdown[]> {
  const ledgerRows = await loadLedgerWithContext();

  const byZone = new Map<string, ZoneBreakdown>();
  for (const row of ledgerRows) {
    const pickup = row.pickups;
    if (!pickup?.zone_id) continue;
    const zone = Array.isArray(pickup.zones) ? pickup.zones[0] : pickup.zones;
    const existing = byZone.get(pickup.zone_id) ?? {
      zoneId: pickup.zone_id,
      zoneName: zone?.name ?? "Unknown zone",
      kgCollected: 0,
      pickupCount: 0,
    };
    existing.kgCollected += row.kg_verified;
    existing.pickupCount += 1;
    byZone.set(pickup.zone_id, existing);
  }

  return Array.from(byZone.values()).sort((a, b) => b.kgCollected - a.kgCollected);
}

export async function getTopAgents(limit = 5): Promise<AgentPerformance[]> {
  const ledgerRows = await loadLedgerWithContext();

  const byAgent = new Map<string, AgentPerformance>();
  for (const row of ledgerRows) {
    const pickup = row.pickups;
    const agent = pickup ? (Array.isArray(pickup.agents) ? pickup.agents[0] : pickup.agents) : null;
    if (!agent) continue;
    const existing = byAgent.get(agent.id) ?? {
      agentId: agent.id,
      fullName: agent.full_name,
      reputationStatus: agent.reputation_status,
      kgCollected: 0,
      pickupCount: 0,
    };
    existing.kgCollected += row.kg_verified;
    existing.pickupCount += 1;
    byAgent.set(agent.id, existing);
  }

  return Array.from(byAgent.values())
    .sort((a, b) => b.kgCollected - a.kgCollected)
    .slice(0, limit);
}
