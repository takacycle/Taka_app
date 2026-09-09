import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";

// Static promotional images bundled with the app (download_assets exports from
// Figma) — these don't change per-user, so there's no need for a Storage bucket.
const REWARD_IMAGES: Record<string, ReturnType<typeof require>> = {
  mtn: require("../assets/rewards/mtn.png"),
  shoprite: require("../assets/rewards/shoprite.png"),
  "tote-bag": require("../assets/rewards/tote-bag.png"),
  tshirt: require("../assets/rewards/tshirt.png"),
};

export interface RewardImageProps {
  imageKey: string | null;
  style?: StyleProp<ImageStyle>;
}

export function RewardImage({ imageKey, style }: RewardImageProps) {
  const source = imageKey ? REWARD_IMAGES[imageKey] : null;
  if (!source) {
    return <View style={[styles.placeholder, style]} />;
  }
  return <Image source={source} style={style} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: "#fafafa" },
});
