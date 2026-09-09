import type { FC } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SvgProps } from "react-native-svg";

interface SectionLabelProps {
  icon: FC<SvgProps>;
  children: string;
}

export function SectionLabel({ icon: Icon, children }: SectionLabelProps) {
  return (
    <View style={styles.row}>
      <Icon width={16} height={16} />
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 10, fontWeight: "600", color: "#868686", textTransform: "uppercase" },
});
