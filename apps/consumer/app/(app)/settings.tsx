import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";

import BackChevronIcon from "../../assets/request-pickup/back-chevron.svg";

export default function SettingsScreen() {
  const { signOut, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your profile and personal data and signs you out. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: handleDelete },
      ],
    );
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteAccount();
      router.replace("/(auth)/sign-in");
    } catch (err) {
      setIsDeleting(false);
      Alert.alert("Couldn't delete account", err instanceof Error ? err.message : "Please try again.");
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <BackChevronIcon width={36} height={36} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <Pressable style={styles.row} onPress={signOut}>
          <Text style={styles.rowText}>Sign out</Text>
        </Pressable>

        <Pressable style={styles.row} onPress={confirmDelete} disabled={isDeleting}>
          {isDeleting ? <ActivityIndicator color="#c0392b" /> : <Text style={styles.rowTextDanger}>Delete my account</Text>}
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
  content: { padding: 20, gap: 12 },
  row: { backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center" },
  rowText: { fontSize: 14, fontWeight: "600", color: "#272727" },
  rowTextDanger: { fontSize: 14, fontWeight: "600", color: "#c0392b" },
});
