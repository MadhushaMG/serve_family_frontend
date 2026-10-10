// FIXME :  meketh hadanna thiye 

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapboxGL from "@rnmapbox/maps";

import type {
  LocationHistoryEntry,
  LocationHistoryFilterKey,
} from "@/src/types/models";
import { fetchOsrmRoute } from "../utils/journeyHelpers";
import {
  calculateHeadingDegrees,
  parseDateInput,
  startOfMonthLocal,
  startOfWeekLocal,
  toDateAtEndOfDay,
  toDateAtMidnight,
} from "../utils/mapUtils";

// ─────────────────────────────────────────────────────────────────────────────
// Type: Mapbox GeoJSON position = [longitude, latitude]
// react-native-maps { latitude, longitude } format සිට වෙනස් වේ!
// ─────────────────────────────────────────────────────────────────────────────
export type MapboxPosition = [number, number]; // [lng, lat]

/** { latitude, longitude } → [longitude, latitude] Mapbox tuple */
function toMapboxPos(c: { latitude: number; longitude: number }): MapboxPosition {
  return [c.longitude, c.latitude];
}

// ─────────────────────────────────────────────────────────────────────────────

export function useLocationHistory() {
  // ── Modal visibility ───────────────────────────────────────────────────────
  const [isLocationHistoryModalVisible, setIsLocationHistoryModalVisible] =
    useState(false);

  // ── Data & loading ─────────────────────────────────────────────────────────
  const [locationHistoryLoading, setLocationHistoryLoading] = useState(false);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>([]);
  const [locationHistoryError, setLocationHistoryError] = useState<string | null>(null);

  // ── Filter state ───────────────────────────────────────────────────────────
  // "today" | "yesterday" | "this_week" | "this_month" | "custom"
  const [locationHistoryActiveFilter, setLocationHistoryActiveFilter] =
    useState<LocationHistoryFilterKey>("today");

  // Custom range: YYYY-MM-DD strings
  const [locationHistoryCustomStart, setLocationHistoryCustomStart] = useState("");
  const [locationHistoryCustomEnd, setLocationHistoryCustomEnd] = useState("");

  // ── Map render gate ────────────────────────────────────────────────────────
  // Modal open → 120ms delay → map render (Mapbox GL perf fix)
  const [shouldRenderLocationHistoryMap, setShouldRenderLocationHistoryMap] =
    useState(false);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);

  // ── OSRM road-snapping ─────────────────────────────────────────────────────
  // Road-snapped route: Mapbox [lng, lat][] tuples
  const [osrmRouteCoords, setOsrmRouteCoords] = useState<MapboxPosition[]>([]);
  const [osrmLoading, setOsrmLoading] = useState(false);

  // ── Mapbox refs ────────────────────────────────────────────────────────────
  // MapView ref — map instance access
  const locationHistoryMapRef = useRef<MapboxGL.MapView | null>(null);

  // Camera ref — fitBounds() / flyTo() / fitBounds()
  // react-native-maps fitToCoordinates() → Mapbox Camera.fitBounds()
  // LocationHistoryModal සහ MapTestScreen දෙකෙන්ම pass වේ
  const locationHistoryCameraRef = useRef<MapboxGL.Camera | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Modal open */
  const handleOpenLocationHistoryModal = useCallback(
    () => setIsLocationHistoryModalVisible(true),
    [],
  );

  /** Modal close + map reset */
  const handleCloseLocationHistoryModal = useCallback(() => {
    setIsLocationHistoryModalVisible(false);
    setShouldRenderLocationHistoryMap(false);
  }, []);

  const handleCustomFilterStartChange = useCallback(
    (v: string) => setLocationHistoryCustomStart(v),
    [],
  );

  const handleCustomFilterEndChange = useCallback(
    (v: string) => setLocationHistoryCustomEnd(v),
    [],
  );

  // ── Map render delay ───────────────────────────────────────────────────────
  // Mapbox GL MapView modal animation block කිරීම වළකවීමට 120ms delay
  useEffect(() => {
    if (!isLocationHistoryModalVisible) {
      setShouldRenderLocationHistoryMap(false);
      return;
    }
    const t = setTimeout(() => setShouldRenderLocationHistoryMap(true), 120);
    return () => clearTimeout(t);
  }, [isLocationHistoryModalVisible]);

  // ── Filtered + computed data ───────────────────────────────────────────────
  const {
    filteredDescending: locationHistoryFilteredDescending,
    polylineCoordinates: locationHistoryPolylineCoordinates,
    mapboxLineCoords: locationHistoryMapboxLineCoords,
    arrowMarkers: locationHistoryArrowMarkers,
    filterError: locationHistoryFilterError,
  } = useMemo(() => {
    const empty = {
      filteredDescending: [] as LocationHistoryEntry[],
      polylineCoordinates: [] as { latitude: number; longitude: number }[],
      mapboxLineCoords: [] as MapboxPosition[],
      arrowMarkers: [] as { id: string; latitude: number; longitude: number; rotation: number }[],
      filterError: null as string | null,
    };

    if (!locationHistory.length) return empty;

    // Date-ascending sort
    const sorted = [...locationHistory].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Filter range calculation
    const now = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;
    let filterError: string | null = null;

    switch (locationHistoryActiveFilter) {
      case "today":
        rangeStart = toDateAtMidnight(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      case "yesterday": {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        rangeStart = toDateAtMidnight(y);
        rangeEnd = toDateAtEndOfDay(y);
        break;
      }
      case "this_week":
        rangeStart = startOfWeekLocal(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      case "this_month":
        rangeStart = startOfMonthLocal(now);
        rangeEnd = toDateAtEndOfDay(now);
        break;
      case "custom": {
        const ps = parseDateInput(locationHistoryCustomStart);
        const pe = parseDateInput(locationHistoryCustomEnd);
        if (!ps || !pe) filterError = "Enter valid dates in YYYY-MM-DD format.";
        else if (ps > pe) filterError = "Start date must be before end date.";
        else {
          rangeStart = toDateAtMidnight(ps);
          rangeEnd = toDateAtEndOfDay(pe);
        }
        break;
      }
      default:
        break;
    }

    // Apply filter (if no entries match, fallback to all sorted entries so data is always displayed)
    const filtered = sorted.filter((e) => {
      const d = new Date(e.createdAt);
      if (Number.isNaN(d.getTime())) return true;
      if (rangeStart && d < rangeStart) return false;
      if (rangeEnd && d > rangeEnd) return false;
      return true;
    });

    const activeList = filtered.length > 0 ? filtered : sorted;
    const filteredDescending = [...activeList].reverse();

    // { latitude, longitude }[] — list view / legacy utils
    const polylineCoordinates = activeList
      .map((e) =>
        Number.isFinite(e.latitude) && Number.isFinite(e.longitude)
          ? { latitude: e.latitude, longitude: e.longitude }
          : null,
      )
      .filter((c): c is { latitude: number; longitude: number } => c !== null);

    // [lng, lat][] — Mapbox ShapeSource / LineLayer
    const mapboxLineCoords: MapboxPosition[] = polylineCoordinates.map(toMapboxPos);

    // Direction arrow markers (midpoint + bearing)
    const arrowMarkers: { id: string; latitude: number; longitude: number; rotation: number }[] = [];
    for (let i = 1; i < filtered.length; i++) {
      const prev = filtered[i - 1];
      const curr = filtered[i];
      if (
        !Number.isFinite(prev.latitude) || !Number.isFinite(prev.longitude) ||
        !Number.isFinite(curr.latitude) || !Number.isFinite(curr.longitude)
      ) continue;

      arrowMarkers.push({
        id: `${prev.id}-${curr.id}`,
        latitude: prev.latitude + (curr.latitude - prev.latitude) * 0.5,
        longitude: prev.longitude + (curr.longitude - prev.longitude) * 0.5,
        rotation: calculateHeadingDegrees(prev, curr),
      });
    }

    return { filteredDescending, polylineCoordinates, mapboxLineCoords, arrowMarkers, filterError };
  }, [
    locationHistory,
    locationHistoryActiveFilter,
    locationHistoryCustomEnd,
    locationHistoryCustomStart,
  ]);

  // ── OSRM road-snapping effect ──────────────────────────────────────────────
  // { latitude, longitude }[] → OSRM → MapboxPosition[]
  // NoRoute / network error → silently fallback ([] → modal uses raw GPS)
  useEffect(() => {
    let mounted = true;
    setOsrmRouteCoords([]);

    if (locationHistoryPolylineCoordinates.length < 2) return;

    const fetchRoute = async () => {
      setOsrmLoading(true);
      try {
        const road = await fetchOsrmRoute(locationHistoryPolylineCoordinates);
        if (!mounted) return;

        // OSRM "NoRoute" හෝ empty result → [] set කරයි
        // Modal එකෙදී raw GPS polyline fallback use කරයි
        if (road && road.length >= 2) {
          setOsrmRouteCoords(road.map(toMapboxPos));
        } else {
          // NoRoute / empty — silently fallback, no crash
          setOsrmRouteCoords([]);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        // "NoRoute", network errors සියල්ල silently ignore
        // Modal: osrmRouteCoords=[] නම් raw GPS coords use කරයි
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("NoRoute") && !msg.includes("no route")) {
          // Unexpected error — log only, no crash
          console.warn("[OSRM] Route fetch failed:", msg);
        }
        setOsrmRouteCoords([]);
      } finally {
        if (mounted) setOsrmLoading(false);
      }
    };

    void fetchRoute();
    return () => { mounted = false; };
  }, [locationHistoryPolylineCoordinates]);

  // ── Map auto-fit via Camera ref ────────────────────────────────────────────
  // Mapbox Camera.fitBounds() — react-native-maps fitToCoordinates() equivalent
  useEffect(() => {
    if (
      !isLocationHistoryModalVisible ||
      !shouldRenderLocationHistoryMap ||
      locationHistoryPolylineCoordinates.length < 2 ||
      !locationHistoryCameraRef.current
    ) return;

    // Deduplicate consecutive identical points
    const unique = locationHistoryPolylineCoordinates.filter(
      (c, i, arr) =>
        i === 0 ||
        c.latitude !== arr[i - 1].latitude ||
        c.longitude !== arr[i - 1].longitude,
    );
    if (!unique.length) return;

    const lats = unique.map((c) => c.latitude);
    const lons = unique.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);

    // Map layout settle delay
    const timer = setTimeout(() => {
      locationHistoryCameraRef.current?.fitBounds(
        [minLon, minLat], // SW [lng, lat]
        [maxLon, maxLat], // NE [lng, lat]
        40,               // padding px (edgePadding equivalent)
        800,              // animation ms
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [
    isLocationHistoryModalVisible,
    locationHistoryPolylineCoordinates,
    shouldRenderLocationHistoryMap,
  ]);

  // ── Map initial region ─────────────────────────────────────────────────────
  // Mapbox Camera initialState + legacy react-native-maps fields (modal backward compat)
  const locationHistoryMapInitialRegion = useMemo(() => {
    if (!locationHistoryPolylineCoordinates.length) return null;

    const lats = locationHistoryPolylineCoordinates.map((c) => c.latitude);
    const lons = locationHistoryPolylineCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    return {
      // Mapbox Camera props
      centerCoordinate: [centerLon, centerLat] as MapboxPosition,
      approximateZoomLevel: Math.max(
        9,
        13 - Math.log2(Math.max((maxLat - minLat) * 1.2, 0.01) / 0.01),
      ),
      sw: [minLon, minLat] as MapboxPosition,
      ne: [maxLon, maxLat] as MapboxPosition,
      // Legacy fields — LocationHistoryModal backward compat
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: Math.max((maxLat - minLat) * 1.2, 0.01),
      longitudeDelta: Math.max((maxLon - minLon) * 1.2, 0.01),
    };
  }, [locationHistoryPolylineCoordinates]);

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // Modal
    isLocationHistoryModalVisible,
    setIsLocationHistoryModalVisible,

    // Data
    locationHistoryLoading,
    setLocationHistoryLoading,
    locationHistory,
    setLocationHistory,
    locationHistoryError,
    setLocationHistoryError,
    loadingMoreHistory,
    setLoadingMoreHistory,

    // Filters
    locationHistoryActiveFilter,
    setLocationHistoryActiveFilter,
    locationHistoryCustomStart,
    setLocationHistoryCustomStart,
    locationHistoryCustomEnd,
    setLocationHistoryCustomEnd,
    locationHistoryFilterError,

    // Computed
    locationHistoryFilteredDescending,
    locationHistoryPolylineCoordinates,   // { lat, lng }[] — list/utils
    locationHistoryMapboxLineCoords,       // [lng, lat][]   — Mapbox LineLayer
    locationHistoryArrowMarkers,

    // OSRM
    osrmRouteCoords,   // [lng, lat][] Mapbox road-snapped
    osrmLoading,

    // Map
    shouldRenderLocationHistoryMap,
    locationHistoryMapRef,           // MapboxGL.MapView ref
    locationHistoryCameraRef,        // MapboxGL.Camera ref ← NEW (fitBounds / flyTo)
    locationHistoryMapInitialRegion, // center + zoom + sw/ne + legacy fields

    // Handlers
    handleOpenLocationHistoryModal,
    handleCloseLocationHistoryModal,
    handleCustomFilterStartChange,
    handleCustomFilterEndChange,
  };
}