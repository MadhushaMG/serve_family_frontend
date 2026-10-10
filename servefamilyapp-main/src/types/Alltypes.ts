import { Ionicons } from "@expo/vector-icons";

export enum NotificationType {
  LOCATION_REACHED = "location_reached", // Location arrived
  LOCATION_LEFT = "location_left", // Departed from location
  INVITE = "invite",
  MEMBERSHIP_ACCEPTED = "membership_accepted", // Join
  MEMBERSHIP_REJECTED = "membership_rejected",
  MEMBER_REMOVED = "member_removed", // Remove
  ROLE_UPDATED = "role_updated", // Change user role
  NICKNAME_UPDATED = "nickname_updated",
  LOCATION_ADDED = "location_added", // Location add to circle
  LOCATION_REMOVED = "location_removed", // Location remove from circle
  LOCATION_ASSIGNED = "location_assigned", // Assign location
  LOCATION_UNASSIGNED = "location_unassigned", // Unassign location
  CRASH_DETECTED = "crash_detected", // App crash
  SOS_ALERT = "sos_alert",
  LOW_BATTERY = "low_battery",
}


export enum NotificationRecipientType {
  ALL_MEMBERS = "all_members",
  CREATOR_AND_ADMINS = "creator_and_admins",
  TRIGGERING_USER_ONLY = "triggering_user_only",
  NONE = "none",
}

export interface CircleNotificationSettings {
  [key: string]: NotificationRecipientType;
}


export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  status?: string;
}

export type StoredLocationSnapshot = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

export type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export type LocationLike = Record<string, unknown>;



export type CachedCircleLocation = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  metadata?: Record<string, unknown> | null;
};

export type CachedCircleLocationMap = Record<string, CachedCircleLocation[]>;
export type LocationPresenceMap = Record<string, Record<string, boolean>>;


export interface NotificationItem {
    id: string;
    type: string; // 'low_battery' | 'sos_alert' | etc.
    message: string;
    read: boolean;
    metadata: {
        title?: string;
        deviceId?: string;
        userAvatar?: string | null;
        [key: string]: any;
    };
    createdAt: string;
    actor?: any;
    circle?: any;
    location?: any;
}


export type SettingsItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  rightElement?: "chevron" | "input" | "none";
  onPress?: () => void;
};