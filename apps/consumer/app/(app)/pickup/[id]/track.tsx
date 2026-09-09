import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getMyPickup, type MyPickup } from "../../../../lib/my-pickups";
import { getPickupAgentLocation, type AgentTrackingInfo } from "../../../../lib/tracking";
import { PickupMap } from "../../../../components/pickup-map";

import BackChevronIcon from "../../../../assets/request-pickup/back-chevron.svg";

const AGENT_POLL_INTERVAL_MS = 15_000;

const STAGES: { key: string; label: string; reachedBy: (status: string) => boolean }[] = [
  { key: "requested", label: "Requested", reachedBy: () => true },
  { key: "assigned", label: "Agent Assigned", reachedBy: (s) => ["assigned", "en_route", "verified"].includes(s) },
  { key: "en_route", label: "Agent En Route", reachedBy: (s) => ["en_route", "verified"].includes(s) },
  { key: "verified", label: "Completed", reachedBy: (s) => s === "verified" },
];

export default function TrackPickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pickup, setPickup] = useState<MyPickup | null>(null);
  const [agent, setAgent] = useState<AgentTrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      getMyPickup(id)
        .then((p) => {
          if (!cancelled) setPickup(p);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const info = await getPickupAgentLocation(id);
        if (!cancelled) setAgent(info);
      } catch {
        // Best-effort — a missed poll just means a stale marker until the next tick.
      }
    }

    poll();
    const interval = setInterval(poll, AGENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!pickup) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Pickup not found.</Text>
      </View>
    );
  }

  const destination = pickup.location;
  const region =
    agent && destination
      ? {
          latitude: (agent.lat + destination.lat) / 2,
          longitude: (agent.lng + destination.lng) / 2,
          latitudeDelta: Math.max(Math.abs(agent.lat - destination.lat) * 2.5, 0.02),
          longitudeDelta: Math.max(Math.abs(agent.lng - destination.lng) * 2.5, 0.02),
        }
      : destination
        ? { latitude: destination.lat, longitude: destination.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
        : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Track Pickup</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.mapContainer}>
        {region ? (
          <PickupMap region={region} destination={destination} agent={agent} />
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No location available yet.</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Pickup details</Text>
          <Text style={styles.addressText}>{pickup.addressText}</Text>
          <Text style={styles.metaText}>{pickup.sackCount} sacks</Text>
        </View>

        {agent && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Your agent</Text>
            <Text style={styles.addressText}>{agent.fullName}</Text>
            <Text style={styles.metaText}>Location updated {formatAge(agent.locationUpdatedAt)}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Pickup status</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {STAGES.map((stage) => {
              const reached = stage.reachedBy(pickup.status);
              return (
                <View key={stage.key} style={styles.stageRow}>
                  <View style={[styles.stageDot, reached && styles.stageDotReached]} />
                  <Text style={[styles.stageLabel, reached && styles.stageLabelReached]}>{stage.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function formatAge(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} min ago`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#868686" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#272727" },
  mapContainer: { height: 260, backgroundColor: "#e9e9e9" },
  content: { padding: 20, gap: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 4 },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  addressText: { fontSize: 14, fontWeight: "600", color: "#272727" },
  metaText: { fontSize: 12, color: "#868686" },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stageDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#e9e9e9" },
  stageDotReached: { backgroundColor: "#3ea35f" },
  stageLabel: { fontSize: 13, color: "#868686" },
  stageLabelReached: { color: "#272727", fontWeight: "600" },
});
