import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getZoneLeaderboard, type LeaderboardEntry, type LeaderboardWindow } from "../../lib/leaderboard";
import { Avatar } from "../../components/avatar";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";

const MEDAL_COLOR = ["#ffd700", "#c0c0c0", "#cd7f32"];

export default function LeaderboardScreen() {
  const { profile, session } = useAuth();
  const [window, setWindow] = useState<LeaderboardWindow>("all_time");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!profile?.zoneId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      getZoneLeaderboard(profile.zoneId, window)
        .then(setEntries)
        .finally(() => setIsLoading(false));
    }, [profile?.zoneId, window]),
  );

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>My Zone</Text>
        </View>
        <Pressable
          style={styles.filterChip}
          onPress={() => setWindow((w) => (w === "all_time" ? "this_week" : "all_time"))}
        >
          <Text style={styles.filterChipText}>{window === "all_time" ? "All Time" : "This Week"}</Text>
        </Pressable>
      </View>

      {!profile?.zoneId ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Set your zone to see your community leaderboard.</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No verified pickups in your zone yet.</Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.podiumRow}>
              {top3.map((entry, index) => (
                <View key={entry.userId} style={[styles.podiumItem, index === 0 && styles.podiumItemFirst]}>
                  <View style={[styles.avatarRing, { borderColor: MEDAL_COLOR[index] }]}>
                    <Avatar userId={entry.userId} size={56} />
                  </View>
                  <Text style={styles.podiumRank}>#{entry.rank}</Text>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {entry.fullName}
                    {entry.userId === session?.user.id ? " (You)" : ""}
                  </Text>
                  <Text style={styles.podiumKg}>{entry.totalKg.toFixed(1)} kg</Text>
                </View>
              ))}
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.userId === session?.user.id;
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rowRank}>#{item.rank}</Text>
                <Avatar userId={item.userId} size={30} />
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.fullName}
                  {isMe ? " (You)" : ""}
                </Text>
                <Text style={styles.rowKg}>{item.totalKg.toFixed(1)} kg</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: "#868686", textAlign: "center" },
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
  filterRow: { flexDirection: "row", gap: 8, padding: 20, paddingBottom: 0 },
  filterChip: { backgroundColor: "#fff", borderRadius: 25, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipText: { fontSize: 12, color: "#272727", fontWeight: "500" },
  list: { padding: 20, gap: 10 },
  podiumRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", marginBottom: 20 },
  podiumItem: { alignItems: "center", gap: 4, width: 90 },
  podiumItemFirst: { marginBottom: 16 },
  avatarRing: { borderWidth: 3, borderRadius: 32, padding: 2 },
  podiumRank: { fontSize: 11, color: "#868686", fontWeight: "600" },
  podiumName: { fontSize: 13, fontWeight: "600", color: "#272727" },
  podiumKg: { fontSize: 12, color: "#868686" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
  },
  rowMe: { borderWidth: 1, borderColor: "#3ea35f" },
  rowRank: { fontSize: 12, color: "#868686", width: 24 },
  rowName: { fontSize: 13, color: "#272727", flex: 1 },
  rowKg: { fontSize: 12, color: "#868686", fontWeight: "600" },
});
