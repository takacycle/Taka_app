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
  // Set by `eas init` — until then, push-notification registration no-ops (see
  // lib/push-notifications.ts). Fill EAS_PROJECT_ID_CONSUMER in .env once you have it.
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID_CONSUMER,
    },
  },
};

export default config;
