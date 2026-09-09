import { StyleSheet, Text, View } from "react-native";
import type { PickupMapProps } from "./pickup-map";

// react-native-maps has no real web implementation (it crashes at import time in
// react-native-web, not render time) — this file is picked automatically instead of
// pickup-map.tsx when bundling for web, per Expo/Metro's platform-extension
// convention. Live tracking needs a real device via Expo Go.
export function PickupMap(_props: PickupMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map view is only available in the mobile app (Expo Go), not the web preview.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  text: { textAlign: "center", color: "#868686", fontSize: 13 },
});
