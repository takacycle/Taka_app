import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickups" />
      <Stack.Screen name="pickup/[id]/track" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="request-pickup" />
      <Stack.Screen name="select-zone" options={{ presentation: "modal" }} />
    </Stack>
  );
}
