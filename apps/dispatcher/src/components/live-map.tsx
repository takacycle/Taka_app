"use client";

import { useMemo } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import type { ActiveAgentLocation } from "@/lib/agents";

interface LiveMapProps {
  agents: ActiveAgentLocation[];
}

const CONTAINER_STYLE = { width: "100%", height: "100%" };

// Cape Coast, Ghana — reasonable default center when there's no agent data yet.
const DEFAULT_CENTER = { lat: 5.1053, lng: -1.2466 };

export function LiveMap({ agents }: LiveMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ?? "",
  });

  const center = useMemo(() => {
    if (agents.length === 0) return DEFAULT_CENTER;
    const avgLat = agents.reduce((sum, a) => sum + a.lat, 0) / agents.length;
    const avgLng = agents.reduce((sum, a) => sum + a.lng, 0) / agents.length;
    return { lat: avgLat, lng: avgLng };
  }, [agents]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_WEB_API_KEY) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        NEXT_PUBLIC_GOOGLE_MAPS_WEB_API_KEY isn&apos;t set.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading map…</div>;
  }

  return (
    <GoogleMap mapContainerStyle={CONTAINER_STYLE} center={center} zoom={agents.length > 0 ? 12 : 8}>
      {agents.map((agent) => (
        <MarkerF
          key={agent.id}
          position={{ lat: agent.lat, lng: agent.lng }}
          title={`${agent.fullName}${agent.currentPickupAddress ? ` — heading to ${agent.currentPickupAddress}` : ""}`}
        />
      ))}
    </GoogleMap>
  );
}
