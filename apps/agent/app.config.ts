import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Takacycle Agent",
  slug: "agent",
  scheme: "takacycle-agent",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  plugins: [
    "expo-router",
    [
      "expo-location",
      {
        locationWhenInUsePermission: "Takacycle Agent uses your location to timestamp pickup verification.",
      },
    ],
    [
      "expo-image-picker",
      {
        cameraPermission: "Takacycle Agent uses your camera to photograph collected material and the scale reading.",
      },
    ],
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.takacycle.agent",
    config: {
      // Maps SDK for iOS only — restrict this key to this bundle ID in Google Cloud.
      googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY,
    },
  },
  android: {
    package: "com.takacycle.agent",
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
};

export default config;
