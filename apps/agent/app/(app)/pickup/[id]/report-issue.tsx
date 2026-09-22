import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../../../lib/auth-context";
import { createSupportTicket } from "../../../../lib/support";

import BackChevronIcon from "../../../../assets/verify-pickup/back-chevron.svg";

export default function ReportIssueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!profile || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await createSupportTicket({ agentId: profile.id, pickupId: id, description: description.trim() });
      Alert.alert("Issue reported", "Your dispatcher will follow up.");
      router.back();
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
        <Text style={styles.headerTitle}>Report an Issue</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>What went wrong?</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue with this pickup"
            placeholderTextColor="#868686"
            multiline
            numberOfLines={5}
            style={styles.input}
          />
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          style={[styles.primaryButton, (!description.trim() || isSubmitting) && styles.primaryButtonDisabled]}
          onPress={handleSubmit}
          disabled={!description.trim() || isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
        </Pressable>
      </View>
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
  content: { flex: 1, padding: 20, gap: 14 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 12 },
  sectionLabel: { fontSize: 10, color: "#868686", fontWeight: "600", textTransform: "uppercase" },
  input: { fontSize: 14, color: "#272727", textAlignVertical: "top", minHeight: 100 },
  primaryButton: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3ea35f",
    borderRadius: 30,
    paddingVertical: 14,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
