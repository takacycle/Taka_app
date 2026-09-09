import * as Location from "expo-location";

export interface Coordinates {
  lat: number;
  lng: number;
}

export async function getCurrentCoordinates(): Promise<{ coords: Coordinates | null; error: string | null }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { coords: null, error: "Location permission denied — you can still type your address manually." };
  }

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { coords: { lat: position.coords.latitude, lng: position.coords.longitude }, error: null };
  } catch {
    return { coords: null, error: "Couldn't get your location — check that location services are on." };
  }
}
