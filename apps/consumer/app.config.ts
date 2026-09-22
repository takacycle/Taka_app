import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Takacycle",
  slug: "consumer",
  scheme: "takacycle-consumer",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Takacycle uses your location to set your pickup address.",
      },
    ],
    "expo-notifications",
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.takacycle.consumer",
    config: {
      // Maps SDK for iOS only — restrict this key to this bundle ID in Google Cloud.
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
    },
  },
  android: {
    package: "com.takacycle.consumer",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    config: {
      // Maps SDK for Android only — restrict this key to this package + SHA-1 in Google Cloud.
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  // From `eas init` (@sirsams-team/consumer). Not a secret — it's a public project
  // identifier, not a credential — so it's safe to hardcode as the fallback here;
  // EAS_PROJECT_ID_CONSUMER in .env can still override it for other environments.
  // Hardcoded (not env-only) because `eas build`/`eas init` source-scan this file
  // for a literal projectId rather than evaluating it through Expo's env loading.
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID_CONSUMER ?? "5826e96e-0766-44b0-b03e-e18b6b110d9b",
    },
  },
};

export default config;
