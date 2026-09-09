import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";

export default function SignInScreen() {
  const { signInWithOtp } = useAuth();
  const [phone, setPhone] = useState("+233");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSendCode() {
    setError(null);

    const normalized = phone.trim();
    if (!/^\+\d{9,15}$/.test(normalized)) {
      setError("Enter a full phone number in international format, e.g. +233241234567");
      return;
    }

    setIsSubmitting(true);
    const { error: otpError } = await signInWithOtp(normalized);
    setIsSubmitting(false);

    if (otpError) {
      setError(otpError);
      return;
    }

    router.push({ pathname: "/(auth)/verify", params: { phone: normalized } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Takacycle</Text>
      <Text style={styles.subtitle}>Enter your phone number to request pickups and earn Taka Points.</Text>

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+233241234567"
        keyboardType="phone-pad"
        autoComplete="tel"
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={handleSendCode} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 15, color: "#555", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: "#c0392b" },
  button: {
    backgroundColor: "#1f9d55",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
