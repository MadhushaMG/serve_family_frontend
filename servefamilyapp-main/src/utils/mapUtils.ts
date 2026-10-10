import AsyncStorage from "@react-native-async-storage/async-storage";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { API_BASE_URL } from "../api/axiosInstance";
import {
  AssignedLocationRecord,
  BatteryLevelInfo,
  CircleEntity,
  CircleMember,
  LocationPoint,
  UserLocation,
} from "../types/models";
import { AVATAR_FIELD_KEYS, CIRCLE_LOCATIONS_CACHE_KEY, LAST_POSTED_LOCATION_STORAGE_KEY, LOCATION_PRESENCE_STORAGE_KEY, NOMINATIM_EMAIL, NOMINATIM_USER_AGENT, WEBP_MIME_TYPE } from "../constants/MapConstants";
import apiClient from "../api/apiClient";
import { CachedCircleLocationMap, LocationUpdatePayload, PickedImage, StoredLocationSnapshot } from "../types/Alltypes";


// ─────────────────────────────────────────────────────────────────────────────
// String / Identifier Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const normalizeIdentifier = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

export const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const parseBooleanPreference = (
  value: string | null | undefined,
  fallback: boolean,
): boolean => {
  if (value === null || value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

// ─────────────────────────────────────────────────────────────────────────────
// Math / Geo Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => haversineDistanceMeters(lat1, lon1, lat2, lon2) / 1000;

export const isValidCoordinate = (lat: number, lon: number): boolean => {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
};

export const calculateHeadingDegrees = (
  from: { latitude: number; longitude: number } | null,
  to: { latitude: number; longitude: number } | null,
): number => {
  if (!from || !to) return 0;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  const bearing = Math.atan2(y, x);
  const bearingDeg = (bearing * 180) / Math.PI;
  return (bearingDeg + 360) % 360;
};

// ─────────────────────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const toDateAtMidnight = (date: Date): Date => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

export const toDateAtEndOfDay = (date: Date): Date => {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
};

export const startOfWeekLocal = (date: Date): Date => {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? 6 : day - 1; // start week on Monday
  clone.setDate(clone.getDate() - diff);
  return toDateAtMidnight(clone);
};

export const startOfMonthLocal = (date: Date): Date => {
  const clone = new Date(date.getFullYear(), date.getMonth(), 1);
  return toDateAtMidnight(clone);
};

export const parseDateInput = (value: string): Date | null => {
  if (!value) return null;
  const parts = value.trim().split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  )
    return null;
  const result = new Date(year, month - 1, day);
  if (Number.isNaN(result.getTime())) return null;
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Role Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const normalizeRole = (role?: string | null): string | null => {
  if (typeof role !== "string") return null;
  const trimmed = role.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

export const formatRoleLabel = (role: string | null): string => {
  if (!role) return "Member";
  if (role === "creator") return "Creator";
  if (role === "admin") return "Admin";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

// ─────────────────────────────────────────────────────────────────────────────
// Image Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const ensureWebpFileName = (name: string): string => {
  const trimmed = name ? name.trim() : "";
  if (!trimmed) return `avatar_${Date.now()}.webp`;
  const normalized = trimmed.replace(/\s+/g, "_");
  const dotIndex = normalized.lastIndexOf(".");
  const base = dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
  return `${base}.webp`;
};

export const isWebpResource = (uri: string, mimeType?: string | null): boolean => {
  const loweredMime = mimeType?.toLowerCase() ?? null;
  if (
    loweredMime &&
    (loweredMime === WEBP_MIME_TYPE || loweredMime.endsWith("+webp"))
  )
    return true;
  const normalizedUri = uri?.toLowerCase?.() ?? "";
  if (!normalizedUri) return false;
  const [pathWithoutQuery] = normalizedUri.split("?");
  return pathWithoutQuery.endsWith(".webp");
};

export const prepareImageAsWebp = async (
  uri: string,
  name: string,
  mimeType: string,
): Promise<PickedImage> => {
  const targetName = ensureWebpFileName(name);
  if (isWebpResource(uri, mimeType)) {
    return { uri, name: targetName, type: WEBP_MIME_TYPE };
  }
  const manipulated = await manipulateAsync(uri, [], {
    compress: 0.9,
    format: SaveFormat.WEBP,
  });
  return { uri: manipulated.uri, name: targetName, type: WEBP_MIME_TYPE };
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar Extraction
// ─────────────────────────────────────────────────────────────────────────────

export const extractAvatarUrl = (
  source: any,
  visited = new WeakSet<object>(),
): string | null => {
  if (!source) return null;
  if (typeof source === "string") {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof source !== "object") return null;
  if (visited.has(source)) return null;
  visited.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      const resolved = extractAvatarUrl(item, visited);
      if (resolved) return resolved;
    }
    return null;
  }

  const extractFromObject = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    if (typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedKeys = ["url", "uri", "href", "source", "path"];
      for (const key of nestedKeys) {
        if (key in nested) {
          const resolved = extractFromObject(nested[key]);
          if (resolved) return resolved;
        }
      }
    }
    return null;
  };

  for (const key of AVATAR_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const resolved = extractFromObject(
        (source as Record<string, unknown>)[key],
      );
      if (resolved) return resolved;
    }
  }

  const relatedObjects = [
    (source as Record<string, unknown>).profile,
    (source as Record<string, unknown>).user,
    (source as Record<string, unknown>).data,
    (source as Record<string, unknown>).attributes,
  ];

  for (const candidate of relatedObjects) {
    if (candidate && typeof candidate === "object") {
      const resolved = extractAvatarUrl(candidate, visited);
      if (resolved) return resolved;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Battery Level Extraction
// ─────────────────────────────────────────────────────────────────────────────

export const extractBatteryLevelInfo = (
  candidate: unknown,
): BatteryLevelInfo | null => {
  if (candidate === null || candidate === undefined) return null;

  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    const clamped = Math.max(0, Math.min(100, candidate));
    return { batteryLevel: clamped, deviceId: null, updatedAt: null };
  }

  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      return { batteryLevel: clamped, deviceId: null, updatedAt: null };
    }
    try {
      const parsedJson = JSON.parse(trimmed);
      if (parsedJson && typeof parsedJson === "object") {
        return extractBatteryLevelInfo(parsedJson);
      }
    } catch {
      // ignore non-JSON strings
    }
    return null;
  }

  if (typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;

  const numericKeys = [
    "level", "batteryLevel", "battery_level", "percentage",
    "percent", "value", "charge", "battery", "current",
  ];

  for (const key of numericKeys) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      const clamped = Math.max(0, Math.min(100, value));
      const deviceId =
        asNonEmptyString(record.deviceId) ??
        asNonEmptyString(record.device_id) ??
        asNonEmptyString(record.device) ??
        asNonEmptyString(record.deviceName) ??
        asNonEmptyString(record.device_name) ??
        null;
      const updatedAt =
        asNonEmptyString(record.updatedAt) ??
        asNonEmptyString(record.updated_at) ??
        asNonEmptyString(record.timestamp) ??
        asNonEmptyString(record.updated) ??
        asNonEmptyString(record.lastUpdated) ??
        asNonEmptyString(record.last_updated) ??
        null;
      return { batteryLevel: clamped, deviceId, updatedAt };
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        const parsed = Number(trimmed);
        if (Number.isFinite(parsed)) {
          const clamped = Math.max(0, Math.min(100, parsed));
          const deviceId =
            asNonEmptyString(record.deviceId) ??
            asNonEmptyString(record.device_id) ??
            asNonEmptyString(record.device) ??
            asNonEmptyString(record.deviceName) ??
            asNonEmptyString(record.device_name) ??
            null;
          const updatedAt =
            asNonEmptyString(record.updatedAt) ??
            asNonEmptyString(record.updated_at) ??
            asNonEmptyString(record.timestamp) ??
            asNonEmptyString(record.updated) ??
            asNonEmptyString(record.lastUpdated) ??
            asNonEmptyString(record.last_updated) ??
            null;
          return { batteryLevel: clamped, deviceId, updatedAt };
        }
      }
    }
    if (value && typeof value === "object") {
      const nested = extractBatteryLevelInfo(value);
      if (nested) return nested;
    }
  }

  const nestedKeys = [
    "batteryLevel", "battery_level", "data", "payload", "info", "latest", "details",
  ];

  for (const key of nestedKeys) {
    const nestedCandidate = record[key];
    if (
      nestedCandidate &&
      typeof nestedCandidate === "object" &&
      nestedCandidate !== record
    ) {
      const nested = extractBatteryLevelInfo(nestedCandidate);
      if (nested) return nested;
    }
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Location Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const normalizeLocationPoint = (loc: any): LocationPoint | null => {
  const latitudeCandidate =
    loc?.latitude ?? loc?.lat ?? loc?.Latitude ?? loc?.Lat;
  const longitudeCandidate =
    loc?.longitude ?? loc?.lng ?? loc?.lon ?? loc?.Longitude ?? loc?.Lon;
  const latitude =
    typeof latitudeCandidate === "string"
      ? Number(latitudeCandidate)
      : latitudeCandidate;
  const longitude =
    typeof longitudeCandidate === "string"
      ? Number(longitudeCandidate)
      : longitudeCandidate;

  if (!isValidCoordinate(latitude, longitude)) return null;

  let metadata: LocationPoint["metadata"] | undefined;
  if (loc?.metadata && typeof loc.metadata === "object") {
    metadata = { ...loc.metadata };
  }

  const mergeMetadata = (
    updates: Partial<NonNullable<LocationPoint["metadata"]>>,
  ) => {
    metadata = { ...(metadata ?? {}), ...updates };
  };

  const inferredAddress =
    loc?.address ??
    loc?.Address ??
    loc?.formattedAddress ??
    loc?.formatted_address;
  if (typeof inferredAddress === "string" && inferredAddress.trim().length > 0) {
    mergeMetadata({
      address: metadata?.address ?? inferredAddress.trim(),
      formattedAddress: metadata?.formattedAddress ?? inferredAddress.trim(),
    });
  }

  if (loc?.radius !== undefined && loc?.radius !== null) {
    const numericRadius = Number(loc.radius);
    if (
      Number.isFinite(numericRadius) &&
      (metadata?.radius === undefined || metadata?.radius === null)
    ) {
      mergeMetadata({ radius: numericRadius });
    }
  }

  const rawId = loc?.id ?? loc?.locationId ?? loc?.LocationId;
  let resolvedId: number | string | undefined;
  if (typeof rawId === "string") {
    resolvedId = rawId.trim().length > 0 ? rawId.trim() : undefined;
  } else if (typeof rawId === "number" && Number.isFinite(rawId)) {
    resolvedId = rawId;
  }

  return {
    id: resolvedId,
    latitude,
    longitude,
    name:
      typeof loc?.name === "string" && loc.name.trim().length > 0
        ? loc.name
        : (loc?.label ?? undefined),
    metadata,
  };
};

export const extractCircleLocations = (circle: any): LocationPoint[] => {
  if (!circle) return [];
  const rawLocations =
    circle?.Locations ??
    circle?.locations ??
    circle?.SavedLocations ??
    circle?.savedLocations ??
    circle?.locationList ??
    [];
  if (!Array.isArray(rawLocations)) return [];
  return rawLocations
    .map((loc) => normalizeLocationPoint(loc))
    .filter((loc): loc is LocationPoint => loc !== null);
};

export const extractCoordinatesFromCandidate = (
  candidate: any,
  visited = new WeakSet<object>(),
): UserLocation | null => {
  if (!candidate) return null;
  if (typeof candidate === "string") {
    try {
      return extractCoordinatesFromCandidate(JSON.parse(candidate), visited);
    } catch {
      return null;
    }
  }
  if (typeof candidate !== "object" || visited.has(candidate)) return null;
  visited.add(candidate);
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const extracted = extractCoordinatesFromCandidate(item, visited);
      if (extracted) return extracted;
    }
    return null;
  }
  const pairs = [
    ["latitude", "longitude"],
    ["lat", "lng"],
    ["lat", "long"],
  ];
  for (const [latKey, lonKey] of pairs) {
    const lat = Number(candidate[latKey]);
    const lon = Number(candidate[lonKey]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        latitude: lat,
        longitude: lon,
        accuracy: Number(candidate.accuracy) || null,
        heading: Number(candidate.heading) || undefined,
      };
    }
  }
  const nestedKeys = [
    "coords", "coordinate", "position", "location", "geo", "point",
    "latestLocation", "lastLocation", "currentLocation", "liveLocation",
  ];
  for (const key of nestedKeys) {
    if (candidate[key]) {
      const found = extractCoordinatesFromCandidate(candidate[key], visited);
      if (found) return found;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Member Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const resolveMemberId = (
  member: CircleMember | null | undefined,
): string | null => {
  if (!member) return null;
  const membershipRecord = ((member as any)?.Membership ?? {}) as Record<
    string,
    unknown
  >;
  const primaryCandidates: unknown[] = [
    (member as any)?.id,
    (member as any)?.userId,
    (member as any)?.UserId,
    (member as any)?.user_id,
    (member as any)?.memberId,
    (member as any)?.member_id,
    (member as any)?.profileId,
    (member as any)?.profile_id,
    (member as any)?._id,
    (member as any)?.uuid,
    membershipRecord.id,
    membershipRecord.userId,
    membershipRecord.user_id,
    membershipRecord.memberId,
    membershipRecord.member_id,
    membershipRecord.profileId,
    membershipRecord.profile_id,
    (member as any)?.user?.id,
    (member as any)?.user?.userId,
    (member as any)?.user?.user_id,
    (member as any)?.user?._id,
    (member as any)?.user?.uuid,
    (member as any)?.account?.id,
    (member as any)?.Account?.id,
    (member as any)?.person?.id,
    (member as any)?.Person?.id,
  ];
  for (const candidate of primaryCandidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) return normalized;
  }
  const fallbackEmail = asNonEmptyString(
    (member as any)?.email ?? (member as any)?.Email,
  );
  if (fallbackEmail) return fallbackEmail.toLowerCase();
  return null;
};

export const resolveMembershipLocationId = (
  member: CircleMember | null | undefined,
): string | null => {
  const membership = member?.Membership as Record<string, unknown> | undefined;
  if (!membership) return null;
  const candidates: unknown[] = [
    membership.locationId,
    membership.LocationId,
    membership.location_id,
    membership.specialLocationId,
    membership.assignedLocationId,
    (membership as any)?.location?.id,
  ];
  const resolved = candidates.find(
    (candidate) => candidate !== undefined && candidate !== null,
  );
  return normalizeIdentifier(resolved ?? null);
};

export const extractCircleMembers = (circle: any): CircleMember[] => {
  if (!circle) return [];
  const candidateLists = [circle?.members, circle?.users, circle?.Users];
  const rawMembers = candidateLists.find((value) => Array.isArray(value)) ?? [];
  if (!Array.isArray(rawMembers)) return [];

  return rawMembers.filter(Boolean).map((member: any) => ({
    id: String(member?.id ?? member?.userId ?? member?.UserId ?? ""),
    name: member?.name ?? member?.Name ?? "Unknown",
    email: member?.email ?? member?.Email ?? null,
    avatar: (() => {
      const raw =
        member?.avatar ??
        extractAvatarUrl(member) ??
        extractAvatarUrl(member?.Membership) ??
        null;
      if (typeof raw === "string" && raw.trim().length > 0) {
        let cleaned = raw.trim();
        if (cleaned.startsWith("/")) {
          cleaned = `${API_BASE_URL}${cleaned}`;
        }
        return cleaned.replace("/api/uploads", "/uploads");
      }
      return raw;
    })(),
    role: member?.role ?? member?.Membership?.role ?? "member",
    status: member?.status ?? member?.Membership?.status ?? "active",
    batteryLevel:
      extractBatteryLevelInfo(member?.batteryLevel?.batteryLevel) ??
      extractBatteryLevelInfo(member?.batteryLevel) ??
      extractBatteryLevelInfo(member?.latestBatteryLevel) ??
      extractBatteryLevelInfo(member?.Membership?.batteryLevel) ??
      null,
    liveLocation:
      member?.liveLocation ??
      member?.live_location ??
      member?.currentLocation ??
      member?.current_location ??
      null,
    journeys: Array.isArray(member?.journeys) ? member.journeys : [],
    Membership: member?.Membership ?? member?.membership ?? undefined,
    todayLocationHistory:
      member?.todayLocationHistory ?? member?.locationHistory ?? [],
  }));
};

export const extractCircleEntities = (circle: any): CircleEntity[] => {
  if (!circle) return [];
  const rawEntities = circle?.entities ?? circle?.Entities ?? [];
  if (!Array.isArray(rawEntities)) return [];
  return rawEntities.map((entity: any) => ({
    id: String(entity.id),
    name: entity.name ?? "Unknown Entity",
    type: entity.type ?? "tracker",
    deviceId: entity.deviceId ?? null,
    liveLocation: entity.liveLocation
      ? {
        latitude: Number(entity.liveLocation.latitude),
        longitude: Number(entity.liveLocation.longitude),
        speed:
          entity.liveLocation.speed != null
            ? Number(entity.liveLocation.speed)
            : undefined,
        updatedAt: entity.liveLocation.updatedAt,
        address: entity.liveLocation.address,
      }
      : null,
    batteryLevel:
      extractBatteryLevelInfo(entity?.batteryLevel?.batteryLevel) ??
      extractBatteryLevelInfo(entity?.batteryLevel) ??
      extractBatteryLevelInfo(entity?.latestBatteryLevel) ??
      null,
    journeys: Array.isArray(entity.journeys) ? entity.journeys : [],
    todayLocationHistory:
      entity?.todayLocationHistory ?? entity?.locationHistory ?? [],
  }));
};

export const buildMemberLocationMap = (
  circleData: any,
  members: CircleMember[],
): Record<string, UserLocation> => {
  const map: Record<string, UserLocation> = {};
  members.forEach((member) => {
    const candidates = [
      member,
      (member as any).latestLocation,
      (member as any).lastLocation,
      (member as any).currentLocation,
      (member as any).location,
      (member as any).Membership?.latestLocation,
    ];
    for (const candidate of candidates) {
      const loc = extractCoordinatesFromCandidate(candidate);
      if (loc) {
        const memberId = resolveMemberId(member);
        if (memberId) map[memberId] = loc;
        break;
      }
    }
  });
  return map;
};

// ─────────────────────────────────────────────────────────────────────────────
// Assigned Location Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const parseAssignedLocationsList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.assignedLocations))
    return payload.assignedLocations;
  return [];
};

export const buildAssignedLocationRecord = (
  item: any,
): { circleId: string; record: AssignedLocationRecord } | null => {
  if (!item) return null;
  const circleId = normalizeIdentifier(
    item.circleId ?? item.CircleId ?? item.circle_id,
  );
  if (!circleId) return null;
  const locationId = normalizeIdentifier(
    item.locationId ?? item.LocationId ?? item.location_id ?? item.location?.id,
  );
  const locationCandidate: Record<string, unknown> =
    item.location && typeof item.location === "object"
      ? { ...item.location }
      : {};
  if (locationCandidate.id === undefined) {
    locationCandidate.id =
      item.location?.id ?? item.locationId ?? item.location_id;
  }
  const latFallback = typeof item.latitude === "number" ? item.latitude : item.lat;
  const lngFallback = typeof item.longitude === "number" ? item.longitude : item.lng;
  if (locationCandidate.latitude === undefined) {
    locationCandidate.latitude =
      item.location?.latitude ?? (locationCandidate as any).lat ?? latFallback;
  }
  if (locationCandidate.longitude === undefined) {
    locationCandidate.longitude =
      item.location?.longitude ?? (locationCandidate as any).lng ?? lngFallback;
  }
  if (locationCandidate.name === undefined) {
    locationCandidate.name = item.location?.name ?? item.name;
  }
  if (locationCandidate.metadata === undefined) {
    locationCandidate.metadata = item.location?.metadata ?? item.metadata;
  }
  const formattedFallback =
    item.location?.formattedAddress ??
    item.location?.formatted_address ??
    item.formattedAddress;
  if (
    (locationCandidate as any).formattedAddress === undefined &&
    formattedFallback !== undefined
  ) {
    (locationCandidate as any).formattedAddress = formattedFallback;
  }
  if (
    (locationCandidate as any).address === undefined &&
    item.location?.address
  ) {
    (locationCandidate as any).address = item.location.address;
  }

  const locationPoint = normalizeLocationPoint(locationCandidate);
  const assignmentId =
    normalizeIdentifier(item.id ?? item.assignmentId ?? item.assignment_id) ??
    `${circleId}:${locationId ?? "pending"}`;

  let normalizedMetadata: Record<string, unknown> | null = null;
  if (item.metadata && typeof item.metadata === "object") {
    normalizedMetadata = { ...item.metadata };
  } else if (item.location?.metadata && typeof item.location.metadata === "object") {
    normalizedMetadata = { ...item.location.metadata };
  }

  const latitudeValue = typeof item.latitude === "number" ? item.latitude : undefined;
  const longitudeValue = typeof item.longitude === "number" ? item.longitude : undefined;

  return {
    circleId,
    record: {
      assignmentId,
      circleId,
      locationId,
      locationPoint,
      latitude: latitudeValue,
      longitude: longitudeValue,
      metadata: normalizedMetadata,
      raw: item,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// AsyncStorage: Last Posted Location
// ─────────────────────────────────────────────────────────────────────────────

export const readLastPostedLocationMap = async (): Promise<
  Record<string, StoredLocationSnapshot>
> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_POSTED_LOCATION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, StoredLocationSnapshot>;
    }
  } catch (error) {
    console.warn("Failed to read cached location updates", error);
  }
  return {};
};

export const writeLastPostedLocationMap = async (
  map: Record<string, StoredLocationSnapshot>,
) => {
  const mapKeys = Object.keys(map);
  if (!mapKeys.length) {
    await AsyncStorage.removeItem(LAST_POSTED_LOCATION_STORAGE_KEY).catch(
      () => undefined,
    );
    return;
  }
  await AsyncStorage.setItem(
    LAST_POSTED_LOCATION_STORAGE_KEY,
    JSON.stringify(map),
  ).catch(() => undefined);
};

export const getLastPostedLocationForCircle = async (
  circleId: string,
): Promise<StoredLocationSnapshot | null> => {
  const map = await readLastPostedLocationMap();
  return map[circleId] ?? null;
};

export const setLastPostedLocationForCircle = async (
  circleId: string,
  coords: { latitude: number; longitude: number },
) => {
  const map = await readLastPostedLocationMap();
  map[circleId] = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: Date.now(),
  };
  await writeLastPostedLocationMap(map);
};

export const removeLastPostedLocationForCircle = async (
  circleId: string,
): Promise<void> => {
  const map = await readLastPostedLocationMap();
  if (map[circleId]) {
    delete map[circleId];
    await writeLastPostedLocationMap(map);
  }
};

export const clearAllPostedLocations = async (): Promise<void> => {
  await AsyncStorage.removeItem(LAST_POSTED_LOCATION_STORAGE_KEY).catch(
    () => undefined,
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Nominatim (OSM) Reverse Geocoding
// ─────────────────────────────────────────────────────────────────────────────

export const getLocationNameFromNominatim = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&email=${encodeURIComponent(NOMINATIM_EMAIL)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept-Language": "en",
      },
    });
    if (!response.ok) {
      console.warn("Nominatim returned non-OK status", response.status);
      return "Unknown Location";
    }
    const data = await response.json();
    if (data && data.display_name) {
      const addr = data.address;
      if (addr) {
        const parts = [
          addr.road || addr.pedestrian || addr.cycleway,
          addr.city || addr.town || addr.village,
        ].filter(Boolean);
        if (parts.length > 0) return parts.join(", ");
      }
      return data.display_name;
    }
    console.warn("Nominatim returned no address:", data);
    return "Unknown Location";
  } catch (error) {
    console.warn("Error fetching location name from Nominatim:", error);
    return "Unknown Location";
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Location Post Helper
// ─────────────────────────────────────────────────────────────────────────────



export const maybePostCircleLocationUpdate = async (
  circleIdLike: unknown,
  coords: LocationUpdatePayload,
): Promise<boolean> => {
  const circleId = normalizeIdentifier(circleIdLike);
  if (!circleId) return false;

  const { latitude, longitude } = coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;

  const previous = await getLastPostedLocationForCircle(circleId);
  if (previous) {
    const distance = haversineDistanceMeters(
      previous.latitude,
      previous.longitude,
      latitude,
      longitude,
    );
    if (distance < 20 && !coords.status) return false;
  }

  const realLocationName = await getLocationNameFromNominatim(latitude, longitude);

  await apiClient.post(`/profile/circles/${circleId}/location`, {
    latitude,
    longitude,
    name: realLocationName,
    metadata: {
      accuracy: coords.accuracy ?? null,
      speed: coords.speed ?? null,
      heading: coords.heading ?? null,
      ...(coords.status ? { status: coords.status } : {}),
    },
  });


  await setLastPostedLocationForCircle(circleId, { latitude, longitude });
  return true;
};


export  const clearCircleLocationsCache = async (): Promise<void> => {
  await AsyncStorage.removeItem(CIRCLE_LOCATIONS_CACHE_KEY).catch(
    () => undefined,
  );
};


export const clearLocationPresenceMap = async (): Promise<void> => {
  await AsyncStorage.removeItem(LOCATION_PRESENCE_STORAGE_KEY).catch(
    () => undefined,
  );
};

export const readCircleLocationsCache = async (): Promise<CachedCircleLocationMap> => {
  try {
    const raw = await AsyncStorage.getItem(CIRCLE_LOCATIONS_CACHE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as CachedCircleLocationMap;
    }
  } catch (error) {
    console.warn("Failed to read circle locations cache", error);
  }
  return {};
};

export const writeCircleLocationsCache = async (
  map: CachedCircleLocationMap,
): Promise<void> => {
  const hasEntries = Object.values(map).some(
    (locations) => locations.length > 0,
  );
  if (!hasEntries) {
    await AsyncStorage.removeItem(CIRCLE_LOCATIONS_CACHE_KEY).catch(
      () => undefined,
    );
    return;
  }

  await AsyncStorage.setItem(
    CIRCLE_LOCATIONS_CACHE_KEY,
    JSON.stringify(map),
  ).catch(() => undefined);
};

export const removeCachedCircleLocations = async (circleId: string): Promise<void> => {
  const map = await readCircleLocationsCache();
  if (!map[circleId]) {
    return;
  }

  delete map[circleId];
  await writeCircleLocationsCache(map);
};

// ─────────────────────────────────────────────────────────────────────────────
// Location Socket & REST API Service Helpers (New API Integration)
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_REST_BASE = "https://test.servefamily.com/api";

export interface RestDirectionsResponse {
  distanceKm: number;
  startAddress: string;
  endAddress: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat]
  };
}

export async function fetchFreeDirections(
  origin: string,
  destination: string
): Promise<RestDirectionsResponse | null> {
  try {
    const url = `${LOCATION_REST_BASE}/directions?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch REST directions", error);
    return null;
  }
}

export interface TaggedRoad {
  osmWayId: string;
  name: string | null;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  consensus: "one_way" | "two_way";
  reportCount: number;
}

export async function fetchTaggedRoads(): Promise<TaggedRoad[]> {
  try {
    const response = await fetch(`${LOCATION_REST_BASE}/road-directions`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn("Failed to fetch tagged roads", error);
    return [];
  }
}

export async function submitRoadTrace(
  points: { lat: number; lng: number }[],
  direction: "one_way" | "two_way"
): Promise<{ matched: boolean; osmWayId?: string; consensus?: string } | null> {
  try {
    const response = await fetch(`${LOCATION_REST_BASE}/road-trace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, direction }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Failed to submit road trace", error);
    return null;
  }
}
