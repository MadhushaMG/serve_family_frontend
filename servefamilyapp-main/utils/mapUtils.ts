import { Linking, Platform } from "react-native";


// ==========================  TYPES & INTERFACES  ==========================
export type ConnectionStatus = "online" | "offline" | "idle";
export type MarkerType = "member" | "saved_place" | "gps_device" | "sos";

export interface FamilyMember {
  id: string;
  name: string;
  profileImage: string | null;
  coordinate: [number, number];
  battery: number;
  speed: number;
  direction: number;
  status: ConnectionStatus;
  onlineStatus: string;
  lastSeen: string;
  accuracy?: number;
  markerType?: MarkerType;
}


export const STATUS_COLORS: Record<ConnectionStatus, string> = {
  online: "#22c55e",
  idle: "#f59e0b",
  offline: "#94a3b8",
};

export const MY_LOCATION = {
  latitude: 7.2906,
  longitude: 80.6337,
};

// ==========================  UTILITY FUNCTIONS  ==========================
export const getStraightLineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): string => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  if (km < 1) return `~${Math.round(km * 1000)} m`;
  return `~${km.toFixed(1)} km`;
};

export const openDirections = async (destLat: number, destLng: number) => {
  const origin = `${MY_LOCATION.latitude},${MY_LOCATION.longitude}`;
  const dest = `${destLat},${destLng}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;

  if (Platform.OS === "android") {
    const geoUrl = `geo:${dest}?q=${dest}`;
    const supported = await Linking.canOpenURL(geoUrl);
    Linking.openURL(supported ? geoUrl : webUrl);
  } else {
    const googleMapsIos = `comgooglemaps://?saddr=${origin}&daddr=${dest}&directionsmode=driving`;
    const appleMapsUrl = `maps://?saddr=${origin}&daddr=${dest}&dirflg=d`;

    const googleSupported = await Linking.canOpenURL(googleMapsIos);
    if (googleSupported) {
      Linking.openURL(googleMapsIos);
    } else {
      const appleSupported = await Linking.canOpenURL(appleMapsUrl);
      Linking.openURL(appleSupported ? appleMapsUrl : webUrl);
    }
  }
}


export const STATUS_LABELS: Record<ConnectionStatus, string> = {
  online: "Online",
  idle: "Idle",
  offline: "Offline",
};

export const formatLastSeen = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
};



export const getBatteryColor = (battery: number): string => {
  if (battery > 50) return "#22c55e";
  if (battery > 20) return "#f59e0b";
  return "#ef4444";
};

export const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

