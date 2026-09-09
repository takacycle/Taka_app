import { StyleSheet } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

export interface PickupMapProps {
  region: Region;
  destination: { lat: number; lng: number } | null;
  agent: { lat: number; lng: number; fullName: string } | null;
}

export function PickupMap({ region, destination, agent }: PickupMapProps) {
  return (
    <MapView style={StyleSheet.absoluteFill} region={region}>
      {destination && (
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title="Pickup location"
          pinColor="#3ea35f"
        />
      )}
      {agent && (
        <Marker
          coordinate={{ latitude: agent.lat, longitude: agent.lng }}
          title={agent.fullName}
          description="Your agent"
        />
      )}
    </MapView>
  );
}
