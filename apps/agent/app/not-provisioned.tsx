import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth-context";

export default function NotProvisionedScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Not set up yet</Text>
      <Text style={styles.subtitle}>
        Your phone number verified, but there's no agent account for it yet. Contact your dispatcher to get set up.
      </Text>

      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 15, color: "#555", marginBottom: 12 },
  button: {
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#333", fontSize: 16, fontWeight: "600" },
});
