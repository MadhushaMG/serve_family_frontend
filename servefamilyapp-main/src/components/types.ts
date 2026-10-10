export type RoleKey = "admin" | "moderator" | "creator" | "member";

export interface BatteryLevel {
  batteryLevel?: number;
}

export interface MembershipInfo {
  nickname?: string;
  role?: string;
}

export interface Member {
  avatar?: string | null;
  battery?: string;
  id: string | number;
  isMe?: boolean;
  isTraker?: boolean;
  lastSeenText?: string;
  latitude: number;
  longitude: number;
  name: string;
  role?: RoleKey;
  speed?: number;
  status?: string;
  type : string;
}

export interface TrackedEntity {
  id: string | number;
  name: string;
  type: "pet" | "item";
  icon?: string;
  status?: string;
  lastSeen?: string;
  speedKmph?: number;
  batteryLevel?: number;
}

export interface SavedPlace {
  id: string | number;
  name: string;
  type?: "home" | "office" | "other";
  latitude: number;
  longitude: number;
  area?: string;
  isAssigned?: boolean;
}