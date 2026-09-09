import { useEffect } from "react";
import { getCurrentCoordinates } from "./location";
import { reportAgentLocation } from "./pickups";

const REPORT_INTERVAL_MS = 20_000;

/**
 * Foreground-only location reporting: reports every ~20s while this hook is
 * mounted and `isActive` is true (e.g. the agent has a pickup's detail/verify
 * screen open). This is NOT background tracking — that needs additional native
 * permissions/entitlements (iOS background modes, Android foreground service)
 * and app store justification we haven't set up. Good enough for a live map
 * while the agent app is in the foreground; not a substitute for true background
 * tracking if that's needed later.
 */
export function useLocationReporting(agentId: string | undefined, isActive: boolean) {
  useEffect(() => {
    if (!agentId || !isActive) return;

    let cancelled = false;

    async function report() {
      const { coords } = await getCurrentCoordinates();
      if (coords && !cancelled && agentId) {
        reportAgentLocation(agentId, coords).catch(() => {
          // Best-effort — a missed location update isn't worth surfacing to the agent.
        });
      }
    }

    report();
    const interval = setInterval(report, REPORT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agentId, isActive]);
}
