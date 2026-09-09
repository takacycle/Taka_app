import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickup/[id]/index" />
      <Stack.Screen name="pickup/[id]/verify" />
    </Stack>
  );
}
