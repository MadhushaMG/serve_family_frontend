import { LocationHistoryFilterKey } from "@/src/types/models";
import { Dimensions, Platform } from "react-native";

// --- Screen Dimensions ---
export const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
  Dimensions.get("window");

// --- Sheet Heights ---
export const TOP_HEADER_HEIGHT = 60;
export const TAB_BAR_HEIGHT = 85;
export const HANDLE_HEIGHT = 30;
export const MAX_HEIGHT = SCREEN_HEIGHT - TOP_HEADER_HEIGHT;
export const MIN_HEIGHT = TAB_BAR_HEIGHT + HANDLE_HEIGHT;
export const MID_HEIGHT = MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) / 2;
export const INITIAL_SHEET_HEIGHT = MID_HEIGHT;

// --- Colors ---
export const COLORS = {
  primary: "#4F359B",
  accent: "#EF4444",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  success: "#22C55E",
};

// --- AsyncStorage Keys ---
export const STORAGE_KEYS = {
  lastSelectedCircleId: "mapScreen:lastSelectedCircleId",
  locationSharingEnabled: "mapScreen:settings:locationSharingEnabled",
  notificationsEnabled: "mapScreen:settings:notificationsEnabled",
};

// --- Background Task ---
export const BACKGROUND_LOCATION_TASK_NAME = "circle-location-background-task";
export const LAST_POSTED_LOCATION_STORAGE_KEY = "mapScreen:lastPostedPerCircle";
export const isNativePlatform =
  Platform.OS === "ios" || Platform.OS === "android";

// --- Cache Keys ---
export const CIRCLE_LOCATIONS_CACHE_KEY = "mapScreen:circleLocationsCache";
export const LOCATION_PRESENCE_STORAGE_KEY = "mapScreen:locationPresenceCache";

// --- Location / Geofence ---
export const DEFAULT_LOCATION_RADIUS_METERS = 20;
export const MAX_USER_ACCURACY_RADIUS = 250;
export const LOCATION_HISTORY_LIMIT = 100;

// --- Circle Colors ---
export const ASSIGNED_LOCATION_STROKE_COLOR = "rgba(79, 53, 155, 0.6)";
export const ASSIGNED_LOCATION_FILL_COLOR = "rgba(79, 53, 155, 0.18)";
export const USER_ACCURACY_STROKE_COLOR = "rgba(79, 70, 229, 0.35)";
export const USER_ACCURACY_FILL_COLOR = "rgba(129, 140, 248, 0.14)";

// --- Refresh Intervals ---
export const MIN_CIRCLE_REFRESH_INTERVAL_MS = 4000;
export const MIN_ASSIGNED_REFRESH_INTERVAL_MS = 4000;
export const MIN_MEMBER_REFRESH_INTERVAL_MS = 3000;

// --- Image ---
export const WEBP_MIME_TYPE = "image/webp";

// --- Battery ---
export const BATTERY_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
export const LOW_BATTERY_THRESHOLD = 20;

// --- Nominatim (OSM Reverse Geocoding) ---
export const NOMINATIM_USER_AGENT =
  "ServeFamilyApp/1.0 (contact@yourdomain.com)";
export const NOMINATIM_EMAIL = "contact@yourdomain.com";

// --- Member / Avatar ---
export const DEFAULT_MEMBER_AVATAR = "https://i.pravatar.cc/120?u=";
export const AVATAR_FIELD_KEYS = [
  "avatar",
  "Avatar",
  "profileImage",
  "profile_image",
  "profileImageUrl",
  "profile_image_url",
  "profileImageURL",
  "profilePicture",
  "profile_picture",
  "profilePic",
  "profile_pic",
  "photo",
  "photoUrl",
  "photo_url",
  "photoURL",
  "picture",
  "image",
  "imageUrl",
  "image_url",
  "imageURL",
];

// --- Location Field Keys ---
export const COORDINATE_FIELD_PAIRS: [string, string][] = [
  ["latitude", "longitude"],
  ["lat", "lng"],
  ["lat", "lon"],
  ["Latitude", "Longitude"],
  ["Lat", "Long"],
  ["LATITUDE", "LONGITUDE"],
  ["LAT", "LON"],
];

export const ACCURACY_FIELD_KEYS = [
  "accuracy",
  "horizontalAccuracy",
  "accuracyMeters",
  "accuracy_meters",
  "precision",
];

export const HEADING_FIELD_KEYS = ["heading", "bearing", "course"];

export const LOCATION_COLLECTION_KEYS = [
  "memberLocations",
  "member_locations",
  "memberLocation",
  "member_location",
  "userLocations",
  "user_locations",
  "usersLocations",
  "users_locations",
  "currentMemberLocations",
  "current_member_locations",
  "currentLocations",
  "current_locations",
  "latestLocations",
  "latest_locations",
  "liveLocations",
  "live_locations",
  "Locations",
  "locations",
  "locationUpdates",
  "location_updates",
];

export const LOCATION_OWNER_ID_KEYS = [
  "userId",
  "user_id",
  "userID",
  "memberId",
  "member_id",
  "memberID",
  "profileId",
  "profile_id",
  "personId",
  "person_id",
  "accountId",
  "account_id",
  "ownerId",
  "owner_id",
  "deviceUserId",
  "device_user_id",
];

// --- Roles ---
export const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

// --- Location History Filters ---


export const LOCATION_HISTORY_FILTERS: {
  key: LocationHistoryFilterKey;
  label: string;
}[] = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "this_week", label: "This Week" },
    { key: "this_month", label: "This Month" },
    { key: "custom", label: "Custom" },
  ];


export const MAP_THEME_LIGHT = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "on" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#edf7ed" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#BBE2F9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];


export const MAP_THEME_DARK = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a0a0c0" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d0d0e8" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#a0a0c0" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#162032" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c54" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a6e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1b2a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a6fa5" }] },
];
