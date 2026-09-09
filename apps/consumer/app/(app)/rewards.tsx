import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { getPointsSummary } from "../../lib/points";
import { listActiveRewards, redeemReward, type Reward } from "../../lib/rewards";
import { RewardImage } from "../../components/reward-image";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";

const CATEGORY_LABEL: Record<string, string> = {
  airtime: "Airtime",
  shopping: "Shopping",
  merch: "Merch",
};

export default function RewardsScreen() {
  const { session } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [selected, setSelected] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReward, setSuccessReward] = useState<Reward | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    setIsLoading(true);
    Promise.all([listActiveRewards(), getPointsSummary(session.user.id)])
      .then(([rewardList, summary]) => {
        setRewards(rewardList);
        setBalance(summary.balance);
      })
      .finally(() => setIsLoading(false));
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const categories = useMemo(
    () => [...new Set(rewards.map((r) => r.category).filter((c): c is string => !!c))],
    [rewards],
  );
  const visibleRewards = activeCategory ? rewards.filter((r) => r.category === activeCategory) : rewards;

  async function handleConfirmRedeem() {
    if (!selected) return;
    setIsRedeeming(true);
    setError(null);
    try {
      const result = await redeemReward(selected.id);
      setBalance(result.newBalance);
      setSuccessReward(selected);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem — try again.");
    } finally {
      setIsRedeeming(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Rewards</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Redeem your points</Text>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceChipText}>{balance} pts</Text>
        </View>
      </View>

      {categories.length > 0 && (
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, activeCategory === null && styles.filterChipActive]}
            onPress={() => setActiveCategory(null)}
          >
            <Text style={[styles.filterChipText, activeCategory === null && styles.filterChipTextActive]}>All</Text>
          </Pressable>
          {categories.map((category) => (
            <Pressable
              key={category}
              style={[styles.filterChip, activeCategory === category && styles.filterChipActive]}
              onPress={() => setActiveCategory(category)}
            >
              <Text style={[styles.filterChipText, activeCategory === category && styles.filterChipTextActive]}>
                {CATEGORY_LABEL[category] ?? category}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visibleRewards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No rewards available right now.</Text>}
          renderItem={({ item }) => {
            const canAfford = balance >= item.pointsCost;
            return (
              <Pressable
                style={[styles.card, !canAfford && styles.cardDisabled]}
                onPress={() => canAfford && setSelected(item)}
                disabled={!canAfford}
              >
                <RewardImage imageKey={item.imageKey} style={styles.cardImage} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
                <View style={styles.costChip}>
                  <Text style={styles.costChipText}>{item.pointsCost} pts</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <RewardImage imageKey={selected?.imageKey ?? null} style={styles.modalImage} />
            <Text style={styles.modalTitle}>Redeem {selected?.name}?</Text>
            <Text style={styles.modalSubtitle}>
              This will use {selected?.pointsCost} points from your balance. This can't be undone.
            </Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
            <Pressable style={styles.primaryButton} onPress={handleConfirmRedeem} disabled={isRedeeming}>
              {isRedeeming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirm</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setSelected(null)} disabled={isRedeeming}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!successReward} transparent animationType="fade" onRequestClose={() => setSuccessReward(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Redeemed! 🎉</Text>
            <Text style={styles.modalSubtitle}>
              {successReward?.name} is on its way — your dispatcher will be in touch about pickup or delivery.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => setSuccessReward(null)}>
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const GREEN = "#3ea35f";

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
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 0,
  },
  balanceLabel: { fontSize: 14, color: "#272727" },
  balanceChip: { backgroundColor: "#fff", borderRadius: 36, paddingHorizontal: 12, paddingVertical: 6 },
  balanceChipText: { fontSize: 12, color: "#868686", fontWeight: "600" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  filterChip: { backgroundColor: "#fff", borderRadius: 26, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "#f8fafc" },
  filterChipText: { fontSize: 12, color: "#3a3a3a", fontWeight: "500" },
  filterChipTextActive: { color: "#0f9d58" },
  list: { padding: 20, gap: 12 },
  emptyText: { textAlign: "center", color: "#868686", marginTop: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
  cardDisabled: { opacity: 0.5 },
  cardImage: { width: 48, height: 48, borderRadius: 10 },
  cardName: { fontSize: 14, fontWeight: "600", color: "#272727" },
  cardDescription: { fontSize: 12, color: "#868686", marginTop: 2 },
  costChip: { backgroundColor: "rgba(255,188,65,0.1)", borderRadius: 36, paddingHorizontal: 10, paddingVertical: 6 },
  costChipText: { fontSize: 12, color: "#868686", fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(27,27,27,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, gap: 14, width: "100%" },
  modalImage: { width: 80, height: 80, borderRadius: 12, alignSelf: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#272727", textAlign: "center" },
  modalSubtitle: { fontSize: 13, color: "#868686", textAlign: "center" },
  errorText: { color: "#c0392b", fontSize: 13, textAlign: "center" },
  primaryButton: { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cancelText: { fontSize: 14, color: "#515050", textAlign: "center" },
});
