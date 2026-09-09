import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { listZones, type Zone } from "../../lib/zones";
import { supabase } from "../../lib/supabase";

export default function SelectZoneScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingZoneId, setSavingZoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listZones()
      .then(setZones)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load zones"))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSelect(zone: Zone) {
    if (!session) return;
    setError(null);
    setSavingZoneId(zone.id);

    const { error: updateError } = await supabase
      .from("app_users")
      .update({ zone_id: zone.id })
      .eq("id", session.user.id);

    setSavingZoneId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    router.back();
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select your zone</Text>
      <Text style={styles.subtitle}>Takacycle currently serves these zones. Pick the one you live in.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={zones}
        keyExtractor={(zone) => zone.id}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const isSelected = profile?.zoneId === item.id;
          return (
            <Pressable
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => handleSelect(item)}
              disabled={savingZoneId !== null}
            >
              <View>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowSubtitle}>{item.city}</Text>
              </View>
              {savingZoneId === item.id ? <ActivityIndicator /> : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.subtitle}>No zones available yet — check back soon.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 8 },
  error: { color: "#c0392b" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowSelected: { borderWidth: 1, borderColor: "#3ea35f" },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#272727" },
  rowSubtitle: { fontSize: 12, color: "#868686", marginTop: 2 },
});
