import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { createSupportTicket, listMySupportTickets, type SupportTicket } from "../../lib/support";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";

const GREEN = "#3ea35f";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "pickup_issue", label: "Pickup issue" },
  { value: "points_rewards", label: "Points or rewards" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

export default function SupportScreen() {
  const { session } = useAuth();
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!session) return;
    setIsLoading(true);
    listMySupportTickets(session.user.id)
      .then(setTickets)
      .finally(() => setIsLoading(false));
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleSubmit() {
    if (!session || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await createSupportTicket({ userId: session.user.id, category, description: description.trim() });
      setDescription("");
      load();
    } catch (err) {
      Alert.alert("Couldn't submit", err instanceof Error ? err.message : "Try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>What's this about?</Text>
          <View style={styles.filterRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.value}
                style={[styles.filterChip, category === c.value && styles.filterChipActive]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={[styles.filterChipText, category === c.value && styles.filterChipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your issue"
            placeholderTextColor="#868686"
            multiline
            numberOfLines={4}
            style={styles.input}
          />
          <Pressable
            style={[styles.submitButton, (!description.trim() || isSubmitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!description.trim() || isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Your tickets</Text>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : tickets.length === 0 ? (
          <Text style={styles.emptyText}>No tickets yet.</Text>
        ) : (
          tickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeaderRow}>
                <Text style={styles.ticketCategory}>
                  {CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category}
                </Text>
                <View style={[styles.statusBadge, ticket.resolvedAt ? styles.statusResolved : styles.statusOpen]}>
                  <Text style={[styles.statusBadgeText, ticket.resolvedAt ? styles.statusResolvedText : styles.statusOpenText]}>
                    {ticket.resolvedAt ? "Resolved" : "Open"}
                  </Text>
                </View>
              </View>
              <Text style={styles.ticketDescription}>{ticket.description}</Text>
              {ticket.resolutionNote && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionLabel}>Response</Text>
                  <Text style={styles.resolutionText}>{ticket.resolutionNote}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  content: { padding: 20, gap: 16 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#272727" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { backgroundColor: "#f8f8f8", borderRadius: 26, paddingHorizontal: 14, paddingVertical: 8 },
  filterChipActive: { backgroundColor: "rgba(62,163,95,0.1)" },
  filterChipText: { fontSize: 12, color: "#3a3a3a", fontWeight: "500" },
  filterChipTextActive: { color: GREEN },
  input: {
    fontSize: 14,
    color: "#272727",
    textAlignVertical: "top",
    minHeight: 90,
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 12,
  },
  submitButton: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyText: { fontSize: 13, color: "#868686" },
  ticketCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 6 },
  ticketHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ticketCategory: { fontSize: 13, fontWeight: "600", color: "#272727" },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  statusOpen: { backgroundColor: "rgba(255,146,146,0.15)" },
  statusResolved: { backgroundColor: "rgba(62,163,95,0.1)" },
  statusBadgeText: { fontSize: 10, fontWeight: "600" },
  statusOpenText: { color: "#ff3535" },
  statusResolvedText: { color: GREEN },
  ticketDescription: { fontSize: 13, color: "#515050" },
  resolutionBox: { backgroundColor: "#fafafa", borderRadius: 10, padding: 10, gap: 2 },
  resolutionLabel: { fontSize: 9, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  resolutionText: { fontSize: 13, color: "#272727" },
});
