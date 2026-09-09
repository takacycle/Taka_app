import { StyleSheet, Text, View } from "react-native";

interface StepProgressProps {
  label: string;
  currentStep: 1 | 2 | 3;
}

const STEPS = [1, 2, 3] as const;

export function StepProgress({ label, currentStep }: StepProgressProps) {
  const fillWidth = currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View style={styles.trackBg} />
        <View style={[styles.trackFill, { width: fillWidth }]} />
        <View style={styles.badgeRow}>
          {STEPS.map((step) => (
            <View key={step} style={[styles.badge, step <= currentStep && styles.badgeActive]}>
              <Text style={[styles.badgeText, step <= currentStep && styles.badgeTextActive]}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#3ea35f", textTransform: "uppercase" },
  track: { height: 20, justifyContent: "center" },
  trackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 80,
    backgroundColor: "#fafafa",
  },
  trackFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 80,
    backgroundColor: "#3ea35f",
  },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: { backgroundColor: "#3ea35f" },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#c4c4c4" },
  badgeTextActive: { color: "#fff" },
});
