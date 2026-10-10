import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CircleEntity,
  CircleMember,
  LocationPoint,
  UserLocation,
} from "@/src/types/models";
import { resolveMemberId } from "@/src/utils/mapScreenHelpers";
import {
  CustomMarker,
  GpsDeviceMarker,
  SavedPlaceMarker,
} from "@/src/components/MapMarker";
import { LocationService } from "@/src/Services/LocationService";
import { OSM_TILE_URL } from "@/src/utils/mapTileHelper";

// ─── Initialize Mapbox ────────────────────────────────────────────────────────
interface GeocodeSuggestion {
  latitude: number;
  longitude: number;
  address: string;
}

type SelectedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type LocationEditPayload = {
  id?: number | string | null;
  latitude: number;
  longitude: number;
  name?: string | null;
  metadata?: Record<string, any> | null;
};

interface AddPlaceModalProps {
  visible: boolean;
  circleId?: number | string | null;
  circleName?: string | null;
  onClose: () => void;
  onPlaceSaved?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  mode?: "create" | "edit";
  editingLocation?: LocationEditPayload | null;
  members?: CircleMember[];
  entities?: CircleEntity[];
  memberLocations?: Record<string, UserLocation>;
  entityLocations?: Record<string, UserLocation>;
  existingLocations?: LocationPoint[];
}

const COLORS = {
  primary: "#4F359B",
  accent: "#EF4444",
  white: "#FFFFFF",
  black: "#1A1A1A",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
};

const DEFAULT_CENTER: [number, number] = [79.8612, 6.9271];
const DEFAULT_ZOOM = 12;

const MIN_RADIUS_METERS = 20;
const MAX_RADIUS_METERS = 5000;
const DEFAULT_RADIUS_METERS = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clampRadiusValue = (value: number): number => {
  if (!Number.isFinite(value)) return MIN_RADIUS_METERS;
  const rounded = Math.round(value);
  if (rounded < MIN_RADIUS_METERS) return MIN_RADIUS_METERS;
  if (rounded > MAX_RADIUS_METERS) return MAX_RADIUS_METERS;
  return rounded;
};

const coerceRadiusValue = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const resolveRadiusFromMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): number | null => {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const candidates: unknown[] = [
    record.radius,
    record.Radius,
    (record as any)?.geofenceRadius,
    (record as any)?.geofence_radius,
    (record as any)?.geofence?.radius,
  ];
  for (const candidate of candidates) {
    const numeric = coerceRadiusValue(candidate);
    if (numeric !== null) return numeric;
    if (candidate && typeof candidate === "object") {
      const nested = coerceRadiusValue(
        (candidate as Record<string, unknown>).radius,
      );
      if (nested !== null) return nested;
    }
  }
  return null;
};

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_USER_AGENT = "MapApp/1.0";

const buildAddressFromReverseGeocode = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.warn("reverseGeocode failed", error);
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

const fetchOsmSuggestions = async (
  query: string,
): Promise<GeocodeSuggestion[]> => {
  try {
    const url = `${NOMINATIM_SEARCH}?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      address: item.display_name,
    }));
  } catch (error) {
    console.warn("OSM geocoding failed", error);
    return [];
  }
};

const gatherSuggestions = async (query: string): Promise<GeocodeSuggestion[]> =>
  fetchOsmSuggestions(query);

// ─── Component ────────────────────────────────────────────────────────────────

const AddPlaceModal: React.FC<AddPlaceModalProps> = ({
  visible,
  circleId,
  circleName,
  onClose,
  onPlaceSaved,
  onDelete,
  mode = "create",
  editingLocation = null,
  members = [],
  entities = [],
  memberLocations = {},
  entityLocations = {},
  existingLocations = [],
}) => {
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<
    GeocodeSuggestion[]
  >([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [placeNickname, setPlaceNickname] = useState("");
  const [hasEditedNickname, setHasEditedNickname] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState<number>(
    DEFAULT_RADIUS_METERS,
  );
  const [radiusInputText, setRadiusInputText] = useState<string>(
    DEFAULT_RADIUS_METERS.toString(),
  );
  const [canShowUserLocation, setCanShowUserLocation] = useState(false);

  // Mapbox camera state – [lng, lat]
  const [cameraCenter, setCameraCenter] =
    useState<[number, number]>(DEFAULT_CENTER);
  const [cameraZoom, setCameraZoom] = useState(DEFAULT_ZOOM);

  const mapRef = useRef<MapboxGL.MapView | null>(null);
  const cameraRef = useRef<MapboxGL.Camera | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHydratedIdRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();

  // ── Derived ──────────────────────────────────────────────────────────────

  const isEditMode = mode === "edit" && !!editingLocation;
  const resolvedCircleName =
    typeof circleName === "string" && circleName.trim().length > 0
      ? circleName.trim()
      : "";
  const headerTitle = isEditMode ? "Update place" : "Add a place";
  let headerSubtitle =
    "Search for an address or drag the map to set a location.";
  if (isEditMode) {
    headerSubtitle = "Review and update this saved location.";
  } else if (resolvedCircleName.length > 0) {
    headerSubtitle = `Add a saved place to ${resolvedCircleName}.`;
  }
  const primaryButtonLabel = isEditMode ? "Update place" : "Save place";

  // ── Sync radius input text ────────────────────────────────────────────────

  useEffect(() => {
    setRadiusInputText(radiusMeters.toString());
  }, [radiusMeters]);

  const handleRadiusTextChange = useCallback((text: string) => {
    setRadiusInputText(text.replace(/[^0-9]/g, ""));
  }, []);

  const handleRadiusTextBlur = useCallback(() => {
    let num = parseInt(radiusInputText, 10);
    if (isNaN(num)) num = MIN_RADIUS_METERS;
    const clamped = clampRadiusValue(num);
    setRadiusMeters(clamped);
    setRadiusInputText(clamped.toString());
  }, [radiusInputText]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetFormState = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setLocationSearchQuery("");
    setLocationSearchResults([]);
    setSelectedLocation(null);
    setPlaceNickname("");
    setHasEditedNickname(false);
    setLocationError(null);
    setIsSearchingLocations(false);
    setIsSavingLocation(false);
    setIsResolvingAddress(false);
    setCameraCenter(DEFAULT_CENTER);
    setCameraZoom(DEFAULT_ZOOM);
    setRadiusMeters(DEFAULT_RADIUS_METERS);
    setCanShowUserLocation(false);
  }, []);

  // ── Location Permission ───────────────────────────────────────────────────

  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      setCanShowUserLocation(granted);
      return granted;
    } catch {
      setCanShowUserLocation(false);
      return false;
    }
  }, []);

  // ── Move camera helper ────────────────────────────────────────────────────

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    setCameraCenter([lng, lat]);
    setCameraZoom(zoom);
    // The <Camera> declarative approach re-renders automatically.
    // animationDuration is set via Camera props below.
  }, []);

  // ── Update selected location ──────────────────────────────────────────────

  const updateSelectedLocation = useCallback(
    async (
      latitude: number,
      longitude: number,
      address?: string,
      skipReverse = false,
      preserveNickname = false,
      shouldAnimate = true,
    ) => {
      setLocationError(null);
      let resolvedAddress = address?.trim();

      if (!resolvedAddress && !skipReverse) {
        setIsResolvingAddress(true);
        resolvedAddress = await buildAddressFromReverseGeocode(
          latitude,
          longitude,
        );
        setIsResolvingAddress(false);
      }

      const finalAddress =
        resolvedAddress && resolvedAddress.length > 0
          ? resolvedAddress
          : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      setSelectedLocation({ latitude, longitude, address: finalAddress });
      setLocationSearchQuery(finalAddress);

      if (!preserveNickname && !hasEditedNickname) {
        setPlaceNickname(finalAddress);
        setHasEditedNickname(false);
      }

      if (shouldAnimate) {
        flyTo(longitude, latitude);
      }
    },
    [hasEditedNickname, flyTo],
  );

  // ── Hydration effect ──────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const hydrateCurrentLocation = async () => {
      const granted = await requestLocationPermission();
      if (!granted || cancelled) return;
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        await updateSelectedLocation(
          current.coords.latitude,
          current.coords.longitude,
          "My Location",
          true,
        );
      } catch (error) {
        console.warn("Unable to fetch current position", error);
      }
    };

    const hydrateExistingLocation = async () => {
      await requestLocationPermission();
      if (!editingLocation || cancelled) return;
      const { latitude, longitude } = editingLocation;

      if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        Number.isNaN(latitude) ||
        Number.isNaN(longitude)
      ) {
        setLocationError(
          "This saved place is missing coordinates and cannot be edited.",
        );
        return;
      }

      const metadata =
        editingLocation.metadata && typeof editingLocation.metadata === "object"
          ? editingLocation.metadata
          : undefined;

      let metadataAddress: string | undefined;
      if (
        metadata &&
        typeof metadata.address === "string" &&
        metadata.address.trim().length > 0
      ) {
        metadataAddress = metadata.address.trim();
      } else if (
        metadata &&
        typeof metadata.formattedAddress === "string" &&
        metadata.formattedAddress.trim().length > 0
      ) {
        metadataAddress = metadata.formattedAddress.trim();
      }

      const fallbackAddress =
        metadataAddress ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      const nicknameSeed =
        typeof editingLocation.name === "string" &&
        editingLocation.name.trim().length > 0
          ? editingLocation.name.trim()
          : fallbackAddress;

      if (cancelled) return;

      const metadataRadius = resolveRadiusFromMetadata(metadata);
      const directRadius = coerceRadiusValue(
        (editingLocation as Record<string, unknown>).radius,
      );
      const initialRadius = clampRadiusValue(
        metadataRadius ?? directRadius ?? DEFAULT_RADIUS_METERS,
      );
      setRadiusMeters(initialRadius);
      setPlaceNickname(nicknameSeed);
      setHasEditedNickname(true);
      setLocationSearchQuery(fallbackAddress);
      await updateSelectedLocation(
        latitude,
        longitude,
        fallbackAddress,
        true,
        true,
      );
    };

    const hydrate = async () => {
      resetFormState();
      if (isEditMode && editingLocation) {
        await hydrateExistingLocation();
      } else {
        await hydrateCurrentLocation();
      }
    };

    if (visible) {
      const currentId = editingLocation?.id
        ? String(editingLocation.id)
        : "create-mode";
      if (lastHydratedIdRef.current !== currentId) {
        hydrate();
        lastHydratedIdRef.current = currentId;
      }
    } else {
      lastHydratedIdRef.current = null;
    }

    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [
    editingLocation,
    isEditMode,
    requestLocationPermission,
    resetFormState,
    updateSelectedLocation,
    visible,
  ]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────

  const performSearch = useCallback(
    async (query: string) => {
      setLocationError(null);
      setIsSearchingLocations(true);
      setLocationSearchResults([]);
      const results = await gatherSuggestions(query);
      if (!results.length) {
        setLocationError("No locations found. Try refining your search.");
        setIsSearchingLocations(false);
        return;
      }
      setLocationSearchResults(results);
      if (!hasEditedNickname) {
        setPlaceNickname(results[0].address || query);
        setHasEditedNickname(false);
      }
      setIsSearchingLocations(false);
    },
    [hasEditedNickname],
  );

  const handleLocationQueryChange = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setLocationSearchQuery(value);
      setLocationError(null);
      const trimmed = value.trim();
      if (!trimmed.length) {
        setLocationSearchResults([]);
        setIsSearchingLocations(false);
        if (!hasEditedNickname) {
          setPlaceNickname("");
          setHasEditedNickname(false);
        }
        return;
      }
      if (!hasEditedNickname) {
        setPlaceNickname(trimmed);
        setHasEditedNickname(false);
      }
      if (trimmed.length < 3) {
        setLocationSearchResults([]);
        return;
      }
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(trimmed);
      }, 400);
    },
    [hasEditedNickname, performSearch],
  );

  const handleSearchLocation = useCallback(async () => {
    const query = locationSearchQuery.trim();
    if (!query) return;
    await performSearch(query);
  }, [locationSearchQuery, performSearch]);

  const handleSelectSearchResult = useCallback(
    async (item: GeocodeSuggestion) => {
      if (isSavingLocation) return;
      const manualLabel = hasEditedNickname ? placeNickname.trim() : "";
      const finalName = (
        manualLabel.length > 0 ? manualLabel : item.address
      ).trim();
      if (manualLabel.length === 0) {
        setPlaceNickname(finalName);
        setHasEditedNickname(false);
      } else {
        setHasEditedNickname(true);
      }
      setLocationSearchQuery(item.address);
      await updateSelectedLocation(
        item.latitude,
        item.longitude,
        finalName,
        true,
      );
      // Clear results after selection
      setLocationSearchResults([]);
    },
    [
      hasEditedNickname,
      isSavingLocation,
      placeNickname,
      updateSelectedLocation,
    ],
  );

  // ── Map camera idle handler (replaces onRegionChangeComplete) ─────────────
  // Mapbox fires onCameraChanged / we use onMapIdle to get the settled center.

  const handleMapIdle = useCallback(
    async (state: MapboxGL.MapState) => {
      if (isSavingLocation) return;
      const [lng, lat] = state.properties.center;
      await updateSelectedLocation(lat, lng, undefined, false, false, false);
    },
    [isSavingLocation, updateSelectedLocation],
  );

  // ── Radius ────────────────────────────────────────────────────────────────

  const handleRadiusSliderChange = useCallback((value: number | number[]) => {
    const next = Array.isArray(value) ? value[0] : value;
    setRadiusMeters(clampRadiusValue(next));
  }, []);

  // ── Circle GeoJSON for Mapbox ─────────────────────────────────────────────

  /**
   * Approximate a circle as a GeoJSON Polygon (64 sides).
   * Mapbox doesn't have a built-in Circle layer for geographic radii like
   * react-native-maps does, so we build it ourselves.
   */
  const buildCircleGeoJSON = useCallback(
    (
      lat: number,
      lng: number,
      radiusM: number,
    ): GeoJSON.Feature<GeoJSON.Polygon> => {
      const points = 64;
      const coords: [number, number][] = [];
      const earthRadius = 6371000;
      const angularDistance = radiusM / earthRadius;
      const latRad = (lat * Math.PI) / 180;
      const lngRad = (lng * Math.PI) / 180;

      for (let i = 0; i <= points; i++) {
        const bearing = (i * 2 * Math.PI) / points;
        const pLat = Math.asin(
          Math.sin(latRad) * Math.cos(angularDistance) +
            Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
        );
        const pLng =
          lngRad +
          Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
            Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pLat),
          );
        coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
      }

      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [coords] },
        properties: {},
      };
    },
    [],
  );

  const circleGeoJSON = useMemo(() => {
    if (!selectedLocation) return null;
    return buildCircleGeoJSON(
      selectedLocation.latitude,
      selectedLocation.longitude,
      clampRadiusValue(radiusMeters),
    );
  }, [selectedLocation, radiusMeters, buildCircleGeoJSON]);

  // ── Save / Delete ─────────────────────────────────────────────────────────

  const saveLocationForCircle = useCallback(
    async (
      location: SelectedLocation,
      nickname: string,
      intent: "create" | "edit",
      locationId?: number | string | null,
      existingMetadata?: Record<string, any> | null,
    ): Promise<boolean> => {
      if (!circleId) {
        Alert.alert(
          intent === "edit" ? "Cannot update place" : "Missing circle",
          intent === "edit"
            ? "Select a circle before updating a saved place."
            : "Select a circle before adding a place.",
        );
        return false;
      }

      if (intent === "edit") {
        const isValidId =
          locationId !== undefined &&
          locationId !== null &&
          String(locationId).trim().length > 0;
        if (!isValidId) {
          Alert.alert(
            "Cannot update place",
            "This location is missing an identifier and cannot be updated.",
          );
          return false;
        }
      }

      const metadataBase =
        existingMetadata && typeof existingMetadata === "object"
          ? { ...existingMetadata }
          : {};
      const sanitizedRadius = clampRadiusValue(radiusMeters);
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        name: nickname,
        metadata: {
          ...metadataBase,
          address: location.address,
          formattedAddress: location.address,
          radius: sanitizedRadius,
        },
      };

      setIsSavingLocation(true);
      setLocationError(null);

      const targetId =
        locationId !== undefined && locationId !== null
          ? String(locationId)
          : null;

      try {
        const response =
          intent === "edit" && targetId
            ? await LocationService.updateLocationForCircle(
                circleId,
                targetId,
                payload,
              )
            : await LocationService.createLocationForCircle(circleId, payload);

        Alert.alert(
          intent === "edit" ? "Place updated" : "Place added",
          intent === "edit"
            ? "This location has been updated for your circle."
            : "This location is now saved in your circle.",
        );
        return true;
      } catch (error: any) {
        console.error("Failed to persist location", error);
        const defaultMessage =
          intent === "edit"
            ? "Unable to update this place."
            : "Unable to save this place.";
        const message = error.message || defaultMessage;
        setLocationError(message);
        Alert.alert(
          intent === "edit" ? "Could not update place" : "Could not add place",
          message,
        );
        return false;
      } finally {
        setIsSavingLocation(false);
      }
    },
    [circleId, radiusMeters],
  );

  const handleSaveLocation = useCallback(async () => {
    if (isSavingLocation || isResolvingAddress || !selectedLocation) return;

    const nicknameBase = hasEditedNickname
      ? placeNickname
      : selectedLocation.address;
    const nickname = (nicknameBase || "").trim() || selectedLocation.address;
    const existingMetadata =
      isEditMode &&
      editingLocation &&
      typeof editingLocation.metadata === "object"
        ? editingLocation.metadata
        : undefined;

    const saved = await saveLocationForCircle(
      selectedLocation,
      nickname,
      isEditMode ? "edit" : "create",
      isEditMode ? (editingLocation?.id ?? null) : undefined,
      existingMetadata ?? null,
    );
    if (saved) {
      if (onPlaceSaved) await onPlaceSaved();
      onClose();
    }
  }, [
    editingLocation,
    hasEditedNickname,
    isEditMode,
    isResolvingAddress,
    isSavingLocation,
    onClose,
    onPlaceSaved,
    placeNickname,
    saveLocationForCircle,
    selectedLocation,
  ]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Place",
      "Are you sure you want to delete this place? User assignments will also be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (onDelete) {
              await onDelete();
              onClose();
            }
          },
        },
      ],
    );
  }, [onDelete, onClose]);

  // ── Derived UI state ──────────────────────────────────────────────────────

  const isSearchDisabled = useMemo(
    () =>
      locationSearchQuery.trim().length === 0 ||
      isSearchingLocations ||
      isSavingLocation,
    [isSavingLocation, isSearchingLocations, locationSearchQuery],
  );

  const isSaveDisabled =
    !selectedLocation || isSavingLocation || isResolvingAddress;
  const mapStatus = isResolvingAddress
    ? "Looking up address..."
    : (selectedLocation?.address ?? "Drag the map to set a pin.");

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <View style={styles.headerSpacer} />
            </View>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>

            {/* Search */}
            <View style={styles.searchInputRow}>
              <Ionicons
                name="search"
                size={18}
                color={COLORS.gray}
                style={styles.searchIcon}
              />
              <TextInput
                value={locationSearchQuery}
                onChangeText={handleLocationQueryChange}
                placeholder="Search for a location"
                placeholderTextColor={COLORS.gray}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                editable={!isSavingLocation}
                onSubmitEditing={handleSearchLocation}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.searchButton,
                isSearchDisabled && styles.primaryButtonDisabled,
              ]}
              onPress={handleSearchLocation}
              disabled={isSearchDisabled}
            >
              {isSearchingLocations ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Search</Text>
              )}
            </TouchableOpacity>

            {locationError ? (
              <Text style={styles.errorText}>{locationError}</Text>
            ) : null}

            {isSearchingLocations ? (
              <View style={styles.resultsPlaceholder}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : locationSearchResults.length > 0 ? (
              <ScrollView
                style={styles.searchResultsContainer}
                keyboardShouldPersistTaps="handled"
              >
                {locationSearchResults.map((item, index) => {
                  const isSelected =
                    selectedLocation?.latitude === item.latitude &&
                    selectedLocation?.longitude === item.longitude;
                  return (
                    <TouchableOpacity
                      key={`${item.latitude}-${item.longitude}-${index}`}
                      style={[
                        styles.searchResultItem,
                        isSelected && styles.searchResultSelected,
                        isSavingLocation && styles.searchResultDisabled,
                      ]}
                      onPress={() => handleSelectSearchResult(item)}
                      disabled={isSavingLocation}
                    >
                      <Ionicons
                        name="location"
                        size={20}
                        color={isSelected ? COLORS.primary : COLORS.gray}
                        style={styles.searchResultIcon}
                      />
                      <View style={styles.searchResultTextWrapper}>
                        <Text style={styles.searchResultTitle}>
                          {item.address}
                        </Text>
                        <Text style={styles.searchResultSubtitle}>
                          {item.latitude.toFixed(4)},{" "}
                          {item.longitude.toFixed(4)}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Radius */}
            <View style={styles.radiusSection}>
              <View style={styles.radiusHeader}>
                <Text style={styles.radiusLabel}>Location radius</Text>
                <View style={styles.radiusInputContainer}>
                  <TextInput
                    style={styles.radiusValueInput}
                    value={radiusInputText}
                    onChangeText={handleRadiusTextChange}
                    onEndEditing={handleRadiusTextBlur}
                    keyboardType="numeric"
                    maxLength={5}
                    editable={!isSavingLocation}
                    selectTextOnFocus
                  />
                  <Text style={styles.radiusValueUnit}> m</Text>
                </View>
              </View>
              <Slider
                style={styles.radiusSlider}
                minimumValue={MIN_RADIUS_METERS}
                maximumValue={MAX_RADIUS_METERS}
                step={5}
                value={radiusMeters}
                onValueChange={handleRadiusSliderChange}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="#D1D5DB"
                thumbTintColor={COLORS.primary}
                disabled={isSavingLocation}
              />
              <View style={styles.radiusHintRow}>
                <Text style={styles.radiusHint}>{MIN_RADIUS_METERS} m</Text>
                <Text style={styles.radiusHint}>{MAX_RADIUS_METERS} m</Text>
              </View>
            </View>

            {/* ── Mapbox Map ────────────────────────────────────────────── */}
            <View style={styles.mapSection}>
              <Text style={styles.mapLabel}>Set the location on the map</Text>
              <View style={styles.mapWrapper}>
                <MapboxGL.MapView
                  ref={mapRef}
                  style={styles.map}
                  styleURL={Platform.OS === "ios" ? MapboxGL.StyleURL.Street : undefined}
                  logoEnabled={false}
                  attributionEnabled
                  attributionPosition={{ bottom: 4, right: 4 }}
                  compassEnabled
                  onMapIdle={handleMapIdle}
                  scrollEnabled={!isSavingLocation}
                  zoomEnabled={!isSavingLocation}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  {Platform.OS === "android" && (
                    <MapboxGL.RasterSource id="osmPlaceTileSource" tileSize={256} tileUrlTemplates={[OSM_TILE_URL]}>
                      <MapboxGL.RasterLayer id="osmPlaceTileLayer" style={{ rasterOpacity: 1 }} />
                    </MapboxGL.RasterSource>
                  )}
                  {/* Camera */}
                  <MapboxGL.Camera
                    ref={cameraRef}
                    centerCoordinate={cameraCenter}
                    zoomLevel={cameraZoom}
                    animationMode="flyTo"
                    animationDuration={280}
                  />

                  {/* User location dot */}
                  {canShowUserLocation && (
                    <MapboxGL.UserLocation
                      visible
                      animated
                    />
                  )}

                  {/* Selected-location radius polygon */}
                  {circleGeoJSON && (
                    <MapboxGL.ShapeSource
                      id="radiusSource"
                      shape={circleGeoJSON}
                    >
                      <MapboxGL.FillLayer
                        id="radiusFill"
                        style={{
                          fillColor: "rgba(239,68,68,0.18)",
                          fillOutlineColor: "rgba(239,68,68,0.6)",
                        }}
                      />
                      <MapboxGL.LineLayer
                        id="radiusBorder"
                        style={{
                          lineColor: "rgba(239,68,68,0.6)",
                          lineWidth: 2,
                        }}
                      />
                    </MapboxGL.ShapeSource>
                  )}

                  {/* Existing saved locations */}
                  {existingLocations.map((loc, index) => {
                    const markerRadius =
                      resolveRadiusFromMetadata(loc.metadata) ??
                      DEFAULT_RADIUS_METERS;
                    return (
                      <SavedPlaceMarker
                        key={`existing-${loc.id || index}`}
                        id={loc.id as any}
                        coordinate={[loc.latitude, loc.longitude]}
                        label={loc.name || "Saved Place"}
                        accuracy={markerRadius}
                      />
                    );
                  })}

                  {/* Members */}
                  {members.map((member) => {
                    const resolvedMemberId = resolveMemberId(member);
                    const loc = resolvedMemberId
                      ? memberLocations[resolvedMemberId]
                      : undefined;
                    if (!loc) return null;

                    const batteryInfo = member.batteryLevel;
                    const batteryPercent =
                      batteryInfo &&
                      typeof batteryInfo.batteryLevel === "number" &&
                      Number.isFinite(batteryInfo.batteryLevel)
                        ? Math.max(
                            0,
                            Math.min(100, Math.round(batteryInfo.batteryLevel)),
                          )
                        : null;

                    return (
                      <CustomMarker
                        key={`member-${resolvedMemberId}`}
                        id={resolvedMemberId as any}
                        coordinate={[loc.latitude, loc.longitude]}
                        name={member.name || "Member"}
                        profileImage={member.avatar || null}
                        battery={batteryPercent as any}
                        direction={90}
                        lastSeen={new Date()}
                        onlineStatus="active"
                        speed={100}
                        status="online"
                      />
                    );
                  })}

                  {/* Entities */}
                  {entities.map((entity) => {
                    const loc = entityLocations[entity.id];
                    if (!loc) return null;
                    return (
                      <GpsDeviceMarker
                        key={`entity-${entity.id}`}
                        id={entity.id}
                        coordinate={[loc.latitude, loc.longitude]}
                        label={entity.name || "Entity"}
                        battery={100}
                        lastSeen={new Date()}
                        status="online"
                      />
                    );
                  })}
                </MapboxGL.MapView>

                {/* Fixed center-pin overlay */}
                <View pointerEvents="none" style={styles.centerPinOverlay}>
                  <Ionicons name="location-sharp" size={48} color="#EF4444" />
                </View>
              </View>

              <Text style={styles.mapHint}>
                Drag the map to fine-tune the spot.
              </Text>
              <Text style={styles.mapStatus}>{mapStatus}</Text>
            </View>

            {/* Nickname */}
            {selectedLocation ? (
              <View style={styles.nicknameSection}>
                <Text style={styles.nicknameLabel}>Label this place</Text>
                <TextInput
                  value={placeNickname}
                  onChangeText={(value) => {
                    setPlaceNickname(value);
                    setHasEditedNickname(value.trim().length > 0);
                  }}
                  placeholder="e.g. Home, Office"
                  placeholderTextColor={COLORS.gray}
                  style={styles.nicknameInput}
                  returnKeyType="done"
                  editable={!isSavingLocation}
                  onSubmitEditing={handleSaveLocation}
                />
              </View>
            ) : null}

            {/* Save */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.saveButton,
                isSaveDisabled && styles.primaryButtonDisabled,
              ]}
              onPress={handleSaveLocation}
              disabled={isSaveDisabled}
            >
              {isSavingLocation ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {primaryButtonLabel}
                </Text>
              )}
            </TouchableOpacity>

            {/* Delete */}
            {isEditMode && onDelete ? (
              <TouchableOpacity
                style={[styles.secondaryButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={isSavingLocation}
              >
                <Text style={styles.deleteButtonText}>Delete Place</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Missing-circle overlay */}
        {!circleId ? (
          <View
            style={[
              styles.missingCircleOverlay,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={COLORS.accent}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.missingCircleTitle}>Select a circle first</Text>
            <Text style={styles.missingCircleSubtitle}>
              You need to choose a circle before saving places.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 24 }]}
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default AddPlaceModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.black,
  },
  headerSpacer: { width: 42 },
  subtitle: { marginTop: 16, color: COLORS.gray, fontSize: 14, lineHeight: 20 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    marginTop: 24,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.black },
  primaryButton: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: { backgroundColor: COLORS.gray, opacity: 0.4 },
  primaryButtonText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  searchButton: { marginTop: 16 },
  resultsPlaceholder: {
    marginTop: 18,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultsContainer: { marginTop: 18, maxHeight: 240 },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  searchResultSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F3F0FF",
  },
  searchResultIcon: { marginRight: 12 },
  searchResultTextWrapper: { flex: 1 },
  searchResultTitle: { fontSize: 15, fontWeight: "600", color: COLORS.black },
  searchResultSubtitle: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  searchResultDisabled: { opacity: 0.6 },
  errorText: {
    marginTop: 12,
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  radiusSection: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  radiusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  radiusLabel: { fontSize: 16, fontWeight: "600", color: COLORS.black },
  radiusInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  radiusValueInput: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    minWidth: 40,
    textAlign: "right",
    padding: 0,
  },
  radiusValueUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 2,
  },
  radiusSlider: { width: "100%", height: 40 },
  radiusHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  radiusHint: { fontSize: 12, color: COLORS.gray },
  mapSection: { marginTop: 28 },
  mapLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 12,
  },
  mapWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 320,
    backgroundColor: "#F8FAFC",
  },
  map: { flex: 1 },
  centerPinOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -24,
    marginTop: -48,
    alignItems: "center",
  },
  mapHint: { marginTop: 12, fontSize: 13, color: COLORS.gray },
  mapStatus: { marginTop: 8, fontSize: 13, color: COLORS.black },
  nicknameSection: { marginTop: 20 },
  nicknameLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 8,
  },
  nicknameInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    fontSize: 16,
    color: COLORS.black,
  },
  saveButton: { marginTop: 24 },
  missingCircleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    paddingHorizontal: 24,
  },
  missingCircleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.black,
    marginBottom: 6,
    textAlign: "center",
  },
  missingCircleSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  deleteButton: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  deleteButtonText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
});
