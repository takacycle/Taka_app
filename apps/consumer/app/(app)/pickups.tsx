import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { listMyPickups, type MyPickup } from "../../lib/my-pickups";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  requested: { label: "Awaiting assignment", color: "#005be4", bg: "rgba(0,102,255,0.1)" },
  assigned: { label: "Agent assigned", color: "#005be4", bg: "rgba(0,102,255,0.1)" },
  en_route: { label: "Agent en route", color: "#005be4", bg: "rgba(0,102,255,0.1)" },
  verified: { label: "Verified", color: "#3ea35f", bg: "rgba(110,255,158,0.1)" },
  completed: { label: "Completed", color: "#3ea35f", bg: "rgba(110,255,158,0.1)" },
  flagged: { label: "Under review", color: "#e45959", bg: "rgba(255,135,135,0.1)" },
  cancelled: { label: "Cancelled", color: "#868686", bg: "#fafafa" },
};

export default function MyPickupsScreen() {
  const { session } = useAuth();
  const [pickups, setPickups] = useState<MyPickup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      setIsLoading(true);
      listMyPickups(session.user.id)
        .then(setPickups)
        .finally(() => setIsLoading(false));
    }, [session]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>My Pickups</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No pickups yet — request your first one.</Text>}
          renderItem={({ item }) => {
            const statusStyle = STATUS_STYLE[item.status] ?? STATUS_STYLE.requested;
            const isTrackable = item.status === "requested" || item.status === "assigned" || item.status === "en_route";
            const CardWrapper = isTrackable ? Pressable : View;
            return (
              <CardWrapper
                style={styles.card}
                {...(isTrackable ? { onPress: () => router.push(`/pickup/${item.id}/track`) } : {})}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardAddress}>{item.addressText}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {new Date(item.requestedAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {item.sackCount} sacks
                </Text>
                {item.pointsAwarded !== null && (
                  <Text style={styles.pointsEarned}>
                    +{item.pointsAwarded} points · {item.kgVerified}kg verified
                  </Text>
                )}
              </CardWrapper>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
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
  list: { padding: 20, gap: 12 },
  empty: { textAlign: "center", color: "#868686", marginTop: 40 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardAddress: { fontSize: 14, fontWeight: "600", color: "#272727", flex: 1 },
  cardMeta: { fontSize: 12, color: "#868686" },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10, fontWeight: "600" },
  pointsEarned: { fontSize: 12, fontWeight: "600", color: "#3ea35f" },
});
