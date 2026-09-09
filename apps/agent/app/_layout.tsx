import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../lib/auth-context";

function RootNavigator() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isSignedIn = !!session;
  const isProvisionedAgent = !!profile;
  const isSuspended = profile?.reputationStatus === "suspended";

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn && !isProvisionedAgent}>
        <Stack.Screen name="not-provisioned" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn && isProvisionedAgent && isSuspended}>
        <Stack.Screen name="suspended" />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn && isProvisionedAgent && !isSuspended}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
