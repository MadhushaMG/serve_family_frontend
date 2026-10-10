import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../store/authStore";

// ─── Key Definitions ──────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = "auth:accessToken";
const REFRESH_TOKEN_KEY = "auth:refreshToken";
const USER_ID_KEY = "auth:userId";
const USER_EMAIL_KEY = "auth:userEmail";
const USER_NAME_KEY = "auth:userName";
const USER_AVATAR_KEY = "auth:userAvatar";
const USER_PLAN_KEY = "auth:userPlan";
const USER_ROLE_KEY = "auth:userRole";
const USER_PHONE_KEY = "auth:userPhone";
const EMAIL_VERIFIED_KEY = "auth:emailVerified";
const PHONE_VERIFIED_KEY = "auth:phoneVerified";
const SESSION_CREATED_AT_KEY = "auth:sessionCreatedAt";
const LAST_ACTIVE_KEY = "auth:lastActive";

// ─── Map Screen Key Definitions ───────────────────────────────────────────────
const MAP_LAST_SELECTED_CIRCLE_ID_KEY = "mapScreen:lastSelectedCircleId";
const MAP_LOCATION_SHARING_ENABLED_KEY = "mapScreen:settings:locationSharingEnabled";
const MAP_NOTIFICATIONS_ENABLED_KEY = "mapScreen:settings:notificationsEnabled";
const MAP_LAST_POSTED_LOCATION_KEY = "mapScreen:lastPostedPerCircle";
const MAP_CIRCLE_LOCATIONS_CACHE_KEY = "mapScreen:circleLocationsCache";
const MAP_LOCATION_PRESENCE_CACHE_KEY = "mapScreen:locationPresenceCache";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StoredUserProfile {
  id: string | null;
  email: string | null;
  name: string | null;
  avatar: string | null;
  plan: string | null;
  role: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
  createdAt: string | null;
  lastActive: string | null;
}

export interface FullStoredAuth extends StoredSession {
  profile: StoredUserProfile;
}

// ─── Map Screen Types ─────────────────────────────────────────────────────────
export interface StoredLocationSnapshot {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface CachedCircleLocation {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  name?: string;
  metadata?: Record<string, unknown> | null;
}

export type CachedCircleLocationMap = Record<string, CachedCircleLocation[]>;
export type LocationPresenceMap = Record<string, Record<string, boolean>>;
export type LastPostedLocationMap = Record<string, StoredLocationSnapshot>;

export interface MapScreenSettings {
  locationSharingEnabled: boolean | null;
  notificationsEnabled: boolean | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeGet = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to store key: ${key}`, error);
  }
};

const safeRemove = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
};

// ─── Token Operations ─────────────────────────────────────────────────────────
export const getAccessToken = async (): Promise<string | null> => {
  return safeGet(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  return safeGet(REFRESH_TOKEN_KEY);
};

export const setTokens = async (
  accessToken: string,
  refreshToken: string
): Promise<void> => {
  const now = new Date().toISOString();
  const ops: Promise<void>[] = [];

  if (accessToken) ops.push(safeSet(ACCESS_TOKEN_KEY, accessToken));
  if (refreshToken) ops.push(safeSet(REFRESH_TOKEN_KEY, refreshToken));
  ops.push(safeSet(SESSION_CREATED_AT_KEY, now));
  ops.push(safeSet(LAST_ACTIVE_KEY, now));

  await Promise.all(ops);
};

export const updateAccessToken = async (accessToken: string): Promise<void> => {
  await Promise.all([
    safeSet(ACCESS_TOKEN_KEY, accessToken),
    safeSet(LAST_ACTIVE_KEY, new Date().toISOString()),
  ]);
};

export const touchLastActive = async (): Promise<void> => {
  await safeSet(LAST_ACTIVE_KEY, new Date().toISOString());
};

// ─── User Profile Operations ──────────────────────────────────────────────────
export const setUserProfile = async (user: {
  id?: string | number | null;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  plan?: any;
  role?: string | null;
  phoneNumber?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}): Promise<void> => {
  const ops: Promise<void>[] = [];

  if (user.id !== undefined && user.id !== null) {
    ops.push(safeSet(USER_ID_KEY, String(user.id)));
  }
  if (user.email) {
    ops.push(safeSet(USER_EMAIL_KEY, user.email));
  }
  if (user.name) {
    ops.push(safeSet(USER_NAME_KEY, user.name));
  }
  if (user.avatar) {
    ops.push(safeSet(USER_AVATAR_KEY, user.avatar));
  }
  if (user.plan !== undefined && user.plan !== null) {
    const planStr =
      typeof user.plan === "string" ? user.plan : JSON.stringify(user.plan);
    ops.push(safeSet(USER_PLAN_KEY, planStr));
  }
  if (user.role) {
    ops.push(safeSet(USER_ROLE_KEY, user.role));
    ops.push(safeSet("userRole", user.role));
  }
  if (user.phoneNumber) {
    ops.push(safeSet(USER_PHONE_KEY, user.phoneNumber));
  }
  if (user.emailVerified !== undefined) {
    ops.push(safeSet(EMAIL_VERIFIED_KEY, user.emailVerified ? "true" : "false"));
  }
  if (user.phoneVerified !== undefined) {
    ops.push(safeSet(PHONE_VERIFIED_KEY, user.phoneVerified ? "true" : "false"));
  }

  await Promise.all(ops);
};

export const getUserProfile = async (): Promise<StoredUserProfile> => {
  const storeUser = useAuthStore.getState().user;
  const [
    id,
    email,
    name,
    avatar,
    plan,
    role,
    phoneNumber,
    emailVerified,
    phoneVerified,
  ] = await Promise.all([
    safeGet(USER_ID_KEY),
    safeGet(USER_EMAIL_KEY),
    safeGet(USER_NAME_KEY),
    safeGet(USER_AVATAR_KEY),
    safeGet(USER_PLAN_KEY),
    safeGet(USER_ROLE_KEY),
    safeGet(USER_PHONE_KEY),
    safeGet(EMAIL_VERIFIED_KEY),
    safeGet(PHONE_VERIFIED_KEY),
  ]);

  return {
    id: id || storeUser?.id || (storeUser as any)?._id || null,
    email: email || storeUser?.email || null,
    name: name || storeUser?.name || null,
    avatar: avatar || storeUser?.avatar || null,
    plan: plan || storeUser?.plan || null,
    role: role || storeUser?.role || null,
    phoneNumber: phoneNumber || storeUser?.phoneNumber || null,
    emailVerified: emailVerified === "true" || Boolean(storeUser?.emailVerified),
    phoneVerified: phoneVerified === "true" || Boolean(storeUser?.phoneVerified),
  };
};

export const updateUserAvatar = async (avatarUrl: string): Promise<void> => {
  await safeSet(USER_AVATAR_KEY, avatarUrl);
};

export const updateUserName = async (name: string): Promise<void> => {
  await safeSet(USER_NAME_KEY, name);
};

export const updateUserPlan = async (plan: any): Promise<void> => {
  const planStr = typeof plan === "string" ? plan : JSON.stringify(plan);
  await safeSet(USER_PLAN_KEY, planStr);
};

// ─── Session Operations ───────────────────────────────────────────────────────
export const getSession = async (): Promise<StoredSession> => {
  const [accessToken, refreshToken, createdAt, lastActive] = await Promise.all([
    safeGet(ACCESS_TOKEN_KEY),
    safeGet(REFRESH_TOKEN_KEY),
    safeGet(SESSION_CREATED_AT_KEY),
    safeGet(LAST_ACTIVE_KEY),
  ]);

  return { accessToken, refreshToken, createdAt, lastActive };
};

export const getFullAuth = async (): Promise<FullStoredAuth> => {
  const [session, profile] = await Promise.all([
    getSession(),
    getUserProfile(),
  ]);

  return { ...session, profile };
};

// ─── Auth State Checks ────────────────────────────────────────────────────────
export const isAuthenticated = async (): Promise<boolean> => {
  const token = await safeGet(ACCESS_TOKEN_KEY);
  return !!token;
};

export const isSessionExpired = async (
  maxAgeMinutes: number = 60 * 24 * 7 // 7 days default
): Promise<boolean> => {
  const lastActive = await safeGet(LAST_ACTIVE_KEY);
  if (!lastActive) return true;

  const lastActiveTime = new Date(lastActive).getTime();
  if (isNaN(lastActiveTime)) return true;

  const ageMs = Date.now() - lastActiveTime;
  const ageMinutes = ageMs / 1000 / 60;

  return ageMinutes > maxAgeMinutes;
};

// ─── Clear Operations ─────────────────────────────────────────────────────────
export const clearTokens = async (): Promise<void> => {
  await Promise.all([
    safeRemove(ACCESS_TOKEN_KEY),
    safeRemove(REFRESH_TOKEN_KEY),
    safeRemove(SESSION_CREATED_AT_KEY),
    safeRemove(LAST_ACTIVE_KEY),
  ]);
};

export const clearUserProfile = async (): Promise<void> => {
  await Promise.all([
    safeRemove(USER_ID_KEY),
    safeRemove(USER_EMAIL_KEY),
    safeRemove(USER_NAME_KEY),
    safeRemove(USER_AVATAR_KEY),
    safeRemove(USER_PLAN_KEY),
    safeRemove(USER_ROLE_KEY),
    safeRemove(USER_PHONE_KEY),
    safeRemove(EMAIL_VERIFIED_KEY),
    safeRemove(PHONE_VERIFIED_KEY),
  ]);
};


export const clearAllAuth = async (): Promise<void> => {
  await Promise.all([clearTokens(), clearUserProfile()]);
};

// ─── Map Screen: Selected Circle ─────────────────────────────────────────────
export const getLastSelectedCircleId = async (): Promise<string | null> => {
  return safeGet(MAP_LAST_SELECTED_CIRCLE_ID_KEY);
};

export const setLastSelectedCircleId = async (circleId: string): Promise<void> => {
  await safeSet(MAP_LAST_SELECTED_CIRCLE_ID_KEY, circleId);
};

export const clearLastSelectedCircleId = async (): Promise<void> => {
  await safeRemove(MAP_LAST_SELECTED_CIRCLE_ID_KEY);
};

// ─── Map Screen: Settings ─────────────────────────────────────────────────────
export const getMapScreenSettings = async (): Promise<MapScreenSettings> => {
  const [locationSharing, notifications] = await Promise.all([
    safeGet(MAP_LOCATION_SHARING_ENABLED_KEY),
    safeGet(MAP_NOTIFICATIONS_ENABLED_KEY),
  ]);

  return {
    locationSharingEnabled: locationSharing === null ? null : locationSharing === "true",
    notificationsEnabled: notifications === null ? null : notifications === "true",
  };
};

export const setLocationSharingEnabled = async (enabled: boolean): Promise<void> => {
  await safeSet(MAP_LOCATION_SHARING_ENABLED_KEY, enabled ? "true" : "false");
};

export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await safeSet(MAP_NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
};

// ─── Map Screen: Last Posted Location Per Circle ──────────────────────────────
const readLastPostedLocationMap = async (): Promise<LastPostedLocationMap> => {
  try {
    const raw = await AsyncStorage.getItem(MAP_LAST_POSTED_LOCATION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LastPostedLocationMap;
  } catch (error) {
    console.warn("Failed to read cached location updates", error);
  }
  return {};
};

const writeLastPostedLocationMap = async (map: LastPostedLocationMap): Promise<void> => {
  if (!Object.keys(map).length) {
    await AsyncStorage.removeItem(MAP_LAST_POSTED_LOCATION_KEY).catch(() => undefined);
    return;
  }
  await AsyncStorage.setItem(MAP_LAST_POSTED_LOCATION_KEY, JSON.stringify(map)).catch(
    () => undefined
  );
};

export const getLastPostedLocationForCircle = async (
  circleId: string
): Promise<StoredLocationSnapshot | null> => {
  const map = await readLastPostedLocationMap();
  return map[circleId] ?? null;
};

export const setLastPostedLocationForCircle = async (
  circleId: string,
  coords: { latitude: number; longitude: number }
): Promise<void> => {
  const map = await readLastPostedLocationMap();
  map[circleId] = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: Date.now(),
  };
  await writeLastPostedLocationMap(map);
};

export const removeLastPostedLocationForCircle = async (circleId: string): Promise<void> => {
  const map = await readLastPostedLocationMap();
  if (map[circleId]) {
    delete map[circleId];
    await writeLastPostedLocationMap(map);
  }
};

export const clearAllPostedLocations = async (): Promise<void> => {
  await AsyncStorage.removeItem(MAP_LAST_POSTED_LOCATION_KEY).catch(() => undefined);
};

// ─── Map Screen: Circle Locations Cache ──────────────────────────────────────
const readCircleLocationsCache = async (): Promise<CachedCircleLocationMap> => {
  try {
    const raw = await AsyncStorage.getItem(MAP_CIRCLE_LOCATIONS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CachedCircleLocationMap;
  } catch (error) {
    console.warn("Failed to read circle locations cache", error);
  }
  return {};
};

const writeCircleLocationsCache = async (map: CachedCircleLocationMap): Promise<void> => {
  const hasEntries = Object.values(map).some((locations) => locations.length > 0);
  if (!hasEntries) {
    await AsyncStorage.removeItem(MAP_CIRCLE_LOCATIONS_CACHE_KEY).catch(() => undefined);
    return;
  }
  await AsyncStorage.setItem(MAP_CIRCLE_LOCATIONS_CACHE_KEY, JSON.stringify(map)).catch(
    () => undefined
  );
};

export const readCachedCircleLocations = async (
  circleId: string
): Promise<CachedCircleLocation[]> => {
  const map = await readCircleLocationsCache();
  return map[circleId] ?? [];
};

export const cacheCircleLocations = async (
  circleId: string,
  locations: CachedCircleLocation[]
): Promise<void> => {
  const map = await readCircleLocationsCache();
  if (locations.length > 0) {
    map[circleId] = locations;
  } else {
    delete map[circleId];
  }
  await writeCircleLocationsCache(map);
};

export const removeCachedCircleLocations = async (circleId: string): Promise<void> => {
  const map = await readCircleLocationsCache();
  if (!map[circleId]) return;
  delete map[circleId];
  await writeCircleLocationsCache(map);
};

export const clearCircleLocationsCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(MAP_CIRCLE_LOCATIONS_CACHE_KEY).catch(() => undefined);
};

// ─── Map Screen: Location Presence Cache ─────────────────────────────────────
export const readLocationPresenceMap = async (): Promise<LocationPresenceMap> => {
  try {
    const raw = await AsyncStorage.getItem(MAP_LOCATION_PRESENCE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as LocationPresenceMap;
  } catch (error) {
    console.warn("Failed to read location presence map", error);
  }
  return {};
};

export const writeLocationPresenceMap = async (map: LocationPresenceMap): Promise<void> => {
  const hasEntries = Object.values(map).some((circle) => Object.keys(circle).length > 0);
  if (!hasEntries) {
    await AsyncStorage.removeItem(MAP_LOCATION_PRESENCE_CACHE_KEY).catch(() => undefined);
    return;
  }
  await AsyncStorage.setItem(MAP_LOCATION_PRESENCE_CACHE_KEY, JSON.stringify(map)).catch(
    () => undefined
  );
};

export const clearLocationPresenceMap = async (): Promise<void> => {
  await AsyncStorage.removeItem(MAP_LOCATION_PRESENCE_CACHE_KEY).catch(() => undefined);
};

// ─── Map Screen: Journey Last Update Time Per Circle ─────────────────────────
export const getJourneyLastUpdateTime = async (circleId: string): Promise<number> => {
  const raw = await safeGet(`journey_last_update_time_${circleId}`);
  if (!raw) return 0;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export const setJourneyLastUpdateTime = async (
  circleId: string,
  timestamp: number
): Promise<void> => {
  await safeSet(`journey_last_update_time_${circleId}`, timestamp.toString());
};

// ─── Map Screen: Full Clear (logout / reset) ──────────────────────────────────
export const clearAllMapScreenData = async (): Promise<void> => {
  await Promise.all([
    safeRemove(MAP_LAST_SELECTED_CIRCLE_ID_KEY),
    safeRemove(MAP_LOCATION_SHARING_ENABLED_KEY),
    safeRemove(MAP_NOTIFICATIONS_ENABLED_KEY),
    clearAllPostedLocations(),
    clearCircleLocationsCache(),
    clearLocationPresenceMap(),
  ]);
};