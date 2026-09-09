import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth-context";

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, signInWithOtp } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);

    if (!/^\d{4,8}$/.test(code)) {
      setError("Enter the code we sent you.");
      return;
    }

    setIsSubmitting(true);
    const { error: verifyError } = await verifyOtp(phone, code);
    setIsSubmitting(false);

    if (verifyError) {
      setError(verifyError);
      return;
    }
    // On success, session updates and the root layout's Stack.Protected
    // guards automatically route to not-provisioned or the app home.
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    const { error: resendError } = await signInWithOtp(phone);
    setResendMessage(resendError ? null : "Code resent.");
    if (resendError) setError(resendError);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a code to {phone}.</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        keyboardType="number-pad"
        autoFocus
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {resendMessage ? <Text style={styles.info}>{resendMessage}</Text> : null}

      <Pressable style={styles.button} onPress={handleVerify} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </Pressable>

      <Pressable onPress={handleResend} style={styles.resend}>
        <Text style={styles.resendText}>Resend code</Text>
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
    letterSpacing: 4,
  },
  error: { color: "#c0392b" },
  info: { color: "#1f6f9d" },
  button: {
    backgroundColor: "#1f6f9d",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resend: { alignItems: "center", marginTop: 8 },
  resendText: { color: "#1f6f9d", fontSize: 14 },
});
