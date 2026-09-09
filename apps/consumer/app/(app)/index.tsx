import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getPointsSummary, type PointsSummary } from "../../lib/points";
import { listMyPickups, findUpcomingPickup, type MyPickup } from "../../lib/my-pickups";
import { getBadgeProgress, currentTier, nextBadge, type BadgeProgress } from "../../lib/badges";
import { getActiveChallenge, type ActiveChallenge } from "../../lib/challenges";

const TIER_LABEL: Record<string, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold" };

const STATUS_LABEL: Record<string, string> = {
  requested: "Awaiting assignment",
  assigned: "Agent assigned",
  en_route: "Agent en route",
};

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [upcoming, setUpcoming] = useState<MyPickup | null>(null);
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!session) return;
    setIsLoading(true);
    getPointsSummary(session.user.id)
      .then((pointsSummary) => {
        setSummary(pointsSummary);
        return Promise.all([
          listMyPickups(session.user.id),
          getBadgeProgress(session.user.id, pointsSummary.kgRecycled),
          profile?.zoneId ? getActiveChallenge(profile.zoneId) : Promise.resolve(null),
        ]);
      })
      .then(([pickups, badgeProgress, activeChallenge]) => {
        setUpcoming(findUpcomingPickup(pickups));
        setBadges(badgeProgress);
        setChallenge(activeChallenge);
      })
      .finally(() => setIsLoading(false));
  }, [session, profile?.zoneId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hey {profile?.fullName ?? "there"} 👋</Text>
        <Pressable onPress={() => router.push("/(app)/settings")}>
          <Text style={styles.headerLink}>Settings</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.content}>
          <View style={styles.pointsCard}>
            <View style={styles.pointsCardTop}>
              <View>
                <Text style={styles.pointsLabel}>Total Taka Points</Text>
                <Text style={styles.pointsValue}>{summary?.balance ?? 0}</Text>
                <Text style={styles.pointsSubtext}>Lifetime earned: {summary?.totalEarned ?? 0}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary?.kgRecycled.toFixed(1) ?? "0.0"}</Text>
                <Text style={styles.statLabel}>kg recycled</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary?.verifiedPickupCount ?? 0}</Text>
                <Text style={styles.statLabel}>pickups</Text>
              </View>
            </View>
            <View style={styles.pointsCardButtonRow}>
              <Pressable
                style={[styles.requestButton, { flex: 1 }]}
                onPress={() => router.push("/(app)/request-pickup")}
              >
                <Text style={styles.requestButtonText}>Request Pickup</Text>
              </Pressable>
              <Pressable
                style={[styles.requestButton, styles.redeemButton, { flex: 1 }]}
                onPress={() => router.push("/(app)/rewards")}
              >
                <Text style={styles.redeemButtonText}>Redeem</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.tierCard} onPress={() => router.push("/(app)/leaderboard")}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Current tier</Text>
              <Text style={styles.tierValue}>
                {(() => {
                  const tier = currentTier(badges);
                  return tier ? TIER_LABEL[tier] : "None yet";
                })()}
              </Text>
              {(() => {
                const next = nextBadge(badges);
                if (!next || !summary) return null;
                const remaining = Math.max(0, next.thresholdKg - summary.kgRecycled);
                return (
                  <Text style={styles.tierSubtext}>
                    {remaining.toFixed(1)}kg to {TIER_LABEL[next.tier]}
                  </Text>
                );
              })()}
            </View>
            <Text style={styles.viewAll}>Leaderboard →</Text>
          </Pressable>

          {challenge && (
            <View style={styles.challengeCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>Active Challenge</Text>
                <Text style={styles.viewAll}>
                  Ends {new Date(challenge.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </Text>
              </View>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              <View style={styles.challengeBarTrack}>
                <View
                  style={[
                    styles.challengeBarFill,
                    { width: `${Math.min(100, Math.max(0, (challenge.progressKg / challenge.targetKg) * 100))}%` },
                  ]}
                />
              </View>
              <Text style={styles.challengeMeta}>
                {challenge.progressKg.toFixed(1)}kg / {challenge.targetKg}kg collected by your zone
              </Text>
            </View>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Upcoming Pickup</Text>
            <Pressable onPress={() => router.push("/(app)/pickups")}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {upcoming ? (
            <Pressable style={styles.upcomingCard} onPress={() => router.push(`/pickup/${upcoming.id}/track`)}>
              <Text style={styles.upcomingAddress}>{upcoming.addressText}</Text>
              <Text style={styles.upcomingMeta}>
                {upcoming.sackCount} sacks · {STATUS_LABEL[upcoming.status] ?? upcoming.status}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.upcomingCard}>
              <Text style={styles.upcomingEmpty}>No pickup in progress right now.</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const GREEN = "#3ea35f";
const DARK_GREEN = "#1f4520";

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: "#272727" },
  headerLink: { color: "#868686", fontSize: 13 },
  content: { padding: 20, gap: 16 },
  pointsCard: { backgroundColor: DARK_GREEN, borderRadius: 20, padding: 20, gap: 16 },
  pointsCardTop: { flexDirection: "row", justifyContent: "space-between" },
  pointsLabel: { fontSize: 10, fontWeight: "600", color: "#fafafa", textTransform: "uppercase" },
  pointsValue: { fontSize: 40, fontWeight: "700", color: "#fff" },
  pointsSubtext: { fontSize: 10, color: "#fafafa" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    backgroundColor: "rgba(0,55,18,0.4)",
    borderRadius: 10,
    paddingVertical: 13,
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontWeight: "700", color: "#fff" },
  statLabel: { fontSize: 8, color: "#fff", textTransform: "uppercase" },
  statDivider: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.3)" },
  pointsCardButtonRow: { flexDirection: "row", gap: 10 },
  requestButton: { backgroundColor: "#fff", borderRadius: 30, paddingVertical: 12, alignItems: "center" },
  requestButtonText: { color: GREEN, fontSize: 14, fontWeight: "600" },
  redeemButton: { backgroundColor: "rgba(255,255,255,0.15)" },
  redeemButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  tierCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  tierValue: { fontSize: 16, fontWeight: "700", color: "#272727", marginTop: 2 },
  tierSubtext: { fontSize: 11, color: "#868686", marginTop: 2 },
  challengeCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 8 },
  challengeName: { fontSize: 16, fontWeight: "700", color: "#272727" },
  challengeBarTrack: { height: 8, borderRadius: 4, backgroundColor: "#eee", overflow: "hidden" },
  challengeBarFill: { height: "100%", borderRadius: 4, backgroundColor: GREEN },
  challengeMeta: { fontSize: 11, color: "#868686" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#272727" },
  viewAll: { fontSize: 12, fontWeight: "600", color: GREEN },
  upcomingCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 4 },
  upcomingAddress: { fontSize: 14, fontWeight: "600", color: "#272727" },
  upcomingMeta: { fontSize: 12, color: "#868686" },
  upcomingEmpty: { fontSize: 13, color: "#868686" },
});
