import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { getAssignedPickup, markPickupEnRoute, type AssignedPickup } from "../../../../lib/pickups";
import { useAuth } from "../../../../lib/auth-context";
import { useLocationReporting } from "../../../../lib/use-location-reporting";

import BackChevronIcon from "../../../../assets/verify-pickup/back-chevron.svg";
import ClockIcon from "../../../../assets/verify-pickup/clock-icon.svg";
import SackIcon from "../../../../assets/verify-pickup/sack-icon.svg";
import LocationIcon from "../../../../assets/verify-pickup/location-icon.svg";
import MapIcon from "../../../../assets/verify-pickup/map-icon.svg";
import MessageIcon from "../../../../assets/verify-pickup/message-circle.svg";
import CallIcon from "../../../../assets/verify-pickup/call-icon.svg";
import AlertIcon from "../../../../assets/verify-pickup/alert-02.svg";
import CheckmarkVector from "../../../../assets/verify-pickup/checkmark-vector.svg";

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [pickup, setPickup] = useState<AssignedPickup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useLocationReporting(profile?.id, true);

  const load = useCallback(() => {
    setIsLoading(true);
    getAssignedPickup(id)
      .then(setPickup)
      .finally(() => setIsLoading(false));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleMarkArrived() {
    if (!pickup) return;
    setIsUpdating(true);
    try {
      if (pickup.status === "assigned") {
        await markPickupEnRoute(pickup.id);
      }
      router.push(`/pickup/${pickup.id}/verify`);
    } catch (err) {
      Alert.alert("Couldn't update pickup", err instanceof Error ? err.message : "Try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  function handleOpenMaps() {
    if (!pickup?.location) {
      Alert.alert("No location on file", "This pickup doesn't have GPS coordinates recorded.");
      return;
    }
    const { lat, lng } = pickup.location;
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  }

  function handleCall() {
    if (!pickup?.requesterPhone) return;
    Linking.openURL(`tel:${pickup.requesterPhone}`);
  }

  function handleMessage() {
    if (!pickup?.requesterPhone) return;
    Linking.openURL(`sms:${pickup.requesterPhone}`);
  }

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Pickup Detail</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.pickupId}>{pickup.id.slice(0, 8).toUpperCase()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <ClockIcon width={14} height={14} />
              <Text style={styles.statValue}>
                {pickup.scheduledAt
                  ? new Date(pickup.scheduledAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Window</Text>
            </View>
            <View style={styles.statChip}>
              <SackIcon width={14} height={14} />
              <Text style={styles.statValue}>{pickup.sackCount}</Text>
              <Text style={styles.statLabel}>Sacks</Text>
            </View>
          </View>
        </View>

        <View style={styles.requesterCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.requesterName}>{pickup.requesterName}</Text>
          </View>
          <Pressable onPress={handleMessage} style={styles.iconButton}>
            <MessageIcon width={36} height={36} />
          </Pressable>
          <Pressable onPress={handleCall} style={styles.iconButton}>
            <CallIcon width={36} height={36} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Address</Text>
          <View style={styles.addressRow}>
            <LocationIcon width={16} height={16} />
            <Text style={styles.addressText}>{pickup.addressText}</Text>
          </View>
          <Pressable style={styles.mapsButton} onPress={handleOpenMaps}>
            <MapIcon width={16} height={16} />
            <Text style={styles.mapsButtonText}>Open in Maps</Text>
          </Pressable>
        </View>

        {pickup.notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{pickup.notes}</Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable style={styles.primaryButton} onPress={handleMarkArrived} disabled={isUpdating}>
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <CheckmarkVector width={14} height={11} />
              <Text style={styles.primaryButtonText}>Mark as Arrived</Text>
            </>
          )}
        </Pressable>

        <Pressable style={styles.reportButton} onPress={() => router.push(`/pickup/${pickup.id}/report-issue`)}>
          <AlertIcon width={18} height={18} />
          <Text style={styles.reportButtonText}>Report an Issue</Text>
        </Pressable>
      </View>
    </View>
  );
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
  content: { flex: 1, padding: 20, gap: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 12 },
  pickupId: { fontSize: 16, fontWeight: "600", color: "#272727", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 11 },
  statChip: {
    flex: 1,
    backgroundColor: "#fafafa",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 14, color: "#515050", fontWeight: "600" },
  statLabel: { fontSize: 8, color: "#868686", textTransform: "uppercase" },
  requesterCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requesterName: { fontSize: 14, color: "#272727" },
  iconButton: { padding: 2 },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  addressRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  addressText: { fontSize: 14, color: "#272727", flex: 1 },
  mapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(110,255,158,0.1)",
    borderRadius: 30,
    paddingVertical: 10,
  },
  mapsButtonText: { fontSize: 12, color: "#3ea35f", fontWeight: "600" },
  notesText: { fontSize: 14, color: "#272727" },
  primaryButton: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3ea35f",
    borderRadius: 30,
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  reportButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  reportButtonText: { color: "#ff3535", fontSize: 14, fontWeight: "600" },
});
