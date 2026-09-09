import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface OpenFraudFlag {
  id: string;
  reason: string;
  createdAt: string;
  pickupId: string;
  requesterName: string;
  agentId: string | null;
  agentName: string | null;
  pointsAtStake: number;
}

export async function listOpenFraudFlags(): Promise<OpenFraudFlag[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("fraud_flags")
    .select(
      "id, reason, created_at, pickup_id, pickups(agent_id, app_users(full_name), agents(full_name), points_ledger(points_awarded))",
    )
    .is("resolved_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const pickup = Array.isArray(row.pickups) ? row.pickups[0] : row.pickups;
    const requester = pickup ? (Array.isArray(pickup.app_users) ? pickup.app_users[0] : pickup.app_users) : null;
    const agent = pickup ? (Array.isArray(pickup.agents) ? pickup.agents[0] : pickup.agents) : null;
    const ledgerEntries = pickup
      ? Array.isArray(pickup.points_ledger)
        ? pickup.points_ledger
        : pickup.points_ledger
          ? [pickup.points_ledger]
          : []
      : [];
    const pointsAtStake = ledgerEntries.reduce((sum, entry) => sum + entry.points_awarded, 0);

    return {
      id: row.id,
      reason: row.reason,
      createdAt: row.created_at,
      pickupId: row.pickup_id,
      requesterName: requester?.full_name ?? "Unknown",
      agentId: pickup?.agent_id ?? null,
      agentName: agent?.full_name ?? null,
      pointsAtStake,
    };
  });
}

// "Dismiss" just closes the flag. "Confirm" carries the design doc's stated
// consequences: points forfeiture + agent suspension.
//
// Points forfeiture is a negative compensating entry, not a delete/update — the
// points_ledger table has no update/delete policy for any role (append-only by
// design, for the same reason a paper ledger doesn't get erased). This keeps the
// original entry as a permanent record while netting the user's balance to zero
// for this pickup.
//
// Agent suspension is reputation_status = 'suspended' with no auto-expiry — the
// design doc mentions a 30-day suspension, but auto-lifting it needs a scheduled
// job this project doesn't have; a dispatcher clears it manually for now.
export async function resolveFraudFlag(flagId: string, action: "dismiss" | "confirm"): Promise<void> {
  const supabase = createAdminClient();

  const { data: flag, error: flagError } = await supabase
    .from("fraud_flags")
    .select("id, pickup_id, agent_id")
    .eq("id", flagId)
    .maybeSingle();
  if (flagError) throw flagError;
  if (!flag) throw new Error("Fraud flag not found");

  if (action === "confirm") {
    const { data: pickup, error: pickupError } = await supabase
      .from("pickups")
      .select("user_id")
      .eq("id", flag.pickup_id)
      .maybeSingle();
    if (pickupError) throw pickupError;

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("points_ledger")
      .select("kg_verified, points_awarded")
      .eq("pickup_id", flag.pickup_id);
    if (ledgerError) throw ledgerError;

    const totalKg = (ledgerRows ?? []).reduce((sum, row) => sum + row.kg_verified, 0);
    const totalPoints = (ledgerRows ?? []).reduce((sum, row) => sum + row.points_awarded, 0);

    if (pickup && totalPoints !== 0) {
      const { error: reversalError } = await supabase.from("points_ledger").insert({
        user_id: pickup.user_id,
        pickup_id: flag.pickup_id,
        kg_verified: -totalKg,
        multiplier: 0,
        points_awarded: -totalPoints,
      });
      if (reversalError) throw reversalError;
    }

    if (flag.agent_id) {
      const { error: agentError } = await supabase
        .from("agents")
        .update({ reputation_status: "suspended" })
        .eq("id", flag.agent_id);
      if (agentError) throw agentError;
    }

    const { error: pickupUpdateError } = await supabase
      .from("pickups")
      .update({ status: "flagged" })
      .eq("id", flag.pickup_id);
    if (pickupUpdateError) throw pickupUpdateError;
  }

  const { error: resolveError } = await supabase
    .from("fraud_flags")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", flagId);
  if (resolveError) throw resolveError;
}
