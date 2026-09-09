import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../../lib/auth-context";
import { listAssignedPickups, type AssignedPickup } from "../../lib/pickups";
import { useLocationReporting } from "../../lib/use-location-reporting";

export default function HomeScreen() {
  const { profile, signOut } = useAuth();
  const [pickups, setPickups] = useState<AssignedPickup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useLocationReporting(profile?.id, pickups.length > 0);

  const load = useCallback(() => {
    if (!profile) return;
    setIsLoading(true);
    listAssignedPickups(profile.id)
      .then(setPickups)
      .finally(() => setIsLoading(false));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Hey {profile?.fullName ?? "there"} 👋</Text>
          <Text style={styles.subtitle}>{pickups.length} pickups assigned to you</Text>
        </View>
        <Pressable onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No pickups assigned right now.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/pickup/${item.id}`)}>
              <Text style={styles.cardAddress}>{item.addressText}</Text>
              <Text style={styles.cardMeta}>
                {item.requesterName} · {item.sackCount} sacks
              </Text>
              {item.status === "en_route" && <Text style={styles.enRoutePill}>En route</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#272727" },
  subtitle: { fontSize: 13, color: "#868686", marginTop: 2 },
  signOut: { color: "#868686", fontSize: 13 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { textAlign: "center", color: "#868686", marginTop: 40 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 4 },
  cardAddress: { fontSize: 14, fontWeight: "600", color: "#272727" },
  cardMeta: { fontSize: 12, color: "#868686" },
  enRoutePill: {
    alignSelf: "flex-start",
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: "#005be4",
    backgroundColor: "rgba(0,102,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    overflow: "hidden",
  },
});
