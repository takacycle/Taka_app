import { Image, StyleSheet, View } from "react-native";

// Flattened exports (download_assets, not get_design_context — that tool decomposes
// illustrations into many positioned fragments meant for web reference code, not a
// single usable asset) of the "Navii" avatar illustrations reused across the Figma
// file (leaderboard, chat, dispatcher topbar, pickup detail, ...). Only 3 of the
// ~4+ variants seen in the designs were pulled — good enough to make the leaderboard
// feel illustrated rather than exhaustive; more can be added the same way later.
const AVATAR_SOURCES = [
  require("../assets/avatars/alice.png"),
  require("../assets/avatars/thzq84fu.png"),
  require("../assets/avatars/srpyib2f.png"),
];

function hashToIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

export interface AvatarProps {
  userId: string;
  size?: number;
}

// Deterministic per-user avatar assignment — the same user always gets the same
// illustration (stable hash of their id), rather than a random one each render.
export function Avatar({ userId, size = 40 }: AvatarProps) {
  const source = AVATAR_SOURCES[hashToIndex(userId, AVATAR_SOURCES.length)];
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image source={source} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: "hidden", backgroundColor: "#fafafa" },
});
