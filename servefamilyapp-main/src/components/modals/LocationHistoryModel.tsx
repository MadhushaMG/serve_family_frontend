import React, { MutableRefObject, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MapboxGL from "@rnmapbox/maps";
import { OSM_TILE_URL } from "@/src/utils/mapTileHelper";
import { useTheme } from "@/src/constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────
type MapboxPosition = [number, number];

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LocationHistoryItem {
  id: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
  createdAt?: string;
  address?: string;
  name?: string | null;
  circleId?: string | null;
}

interface LocationHistoryFilter {
  key: string;
  label: string;
}

interface ArrowMarker {
  id: string;
  latitude: number;
  longitude: number;
  rotation: number;
}

export interface JourneyGroup {
  id: string;
  title: string;
  startTimeLabel: string;
  endTimeLabel: string;
  startPlace: string;
  endPlace: string;
  points: LocationHistoryItem[];
  displayStops: LocationHistoryItem[];
  mapboxCoords: MapboxPosition[];
  startCoord: MapboxPosition | null;
  endCoord: MapboxPosition | null;
  bounds: {
    ne: MapboxPosition;
    sw: MapboxPosition;
    paddingBottom: number;
    paddingTop: number;
    paddingLeft: number;
    paddingRight: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LOW_BATTERY_THRESHOLD = 20;

const LOCATION_HISTORY_FILTERS: LocationHistoryFilter[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isLocationHistoryModalVisible: boolean;
  handleCloseLocationHistoryModal: () => void;
  batteryUpdatedAtLabel: string | null;
  batteryLevelPercent: number | null;
  locationHistoryLoading: boolean;
  handleRefreshLocationHistory: () => void;
  locationHistoryActiveFilter: string;
  handleSelectLocationHistoryFilter: (key: string) => void;
  locationHistoryCustomStart: string;
  locationHistoryCustomEnd: string;
  handleCustomFilterStartChange: (val: string) => void;
  handleCustomFilterEndChange: (val: string) => void;
  shouldRenderLocationHistoryMap: boolean;
  locationHistoryPolylineCoordinates: Coordinate[];
  osrmRouteCoords: MapboxPosition[];
  locationHistoryMapInitialRegion: {
    centerCoordinate?: MapboxPosition;
    approximateZoomLevel?: number;
    sw?: MapboxPosition;
    ne?: MapboxPosition;
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
  locationHistoryArrowMarkers: ArrowMarker[];
  locationHistoryFilterError: string | null;
  locationHistoryError: string | null;
  locationHistory: LocationHistoryItem[];
  locationHistoryFilteredDescending: LocationHistoryItem[];
  locationHistoryKeyExtractor?: (item: LocationHistoryItem) => string;
  renderLocationHistoryItem?: ({
    item,
  }: {
    item: LocationHistoryItem;
  }) => React.ReactElement;
  memberName?: string;
  locationHistoryCameraRef?: MutableRefObject<MapboxGL.Camera | null>;
}

// ─── GeoJSON helpers ──────────────────────────────────────────────────────────
function toLineStringGeoJSON(positions: MapboxPosition[]) {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: positions },
        properties: {},
      },
    ],
  };
}

// ─── Clean Place Names (Ignore Raw Placeholders) ──────────────────────────────
function getCleanName(val?: string | null): string {
  if (!val) return "";
  const s = val.trim();
  if (!s || s.toLowerCase().includes("background location") || s.toLowerCase().includes("raw")) {
    return "";
  }
  return s;
}

// ─── Group Points into Journey Trips ───────────────────────────────────────────
function groupPointsIntoJourneys(items: LocationHistoryItem[]): JourneyGroup[] {
  if (!items || items.length === 0) return [];

  // Sort ascending by time
  const sorted = [...items].sort((a, b) => {
    const tA = new Date(a.createdAt || a.timestamp || 0).getTime();
    const tB = new Date(b.createdAt || b.timestamp || 0).getTime();
    return tA - tB;
  });

  const segments: LocationHistoryItem[][] = [];
  let currentSegment: LocationHistoryItem[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    if (currentSegment.length === 0) {
      currentSegment.push(point);
    } else {
      const prevPoint = currentSegment[currentSegment.length - 1];
      const prevTime = new Date(prevPoint.createdAt || prevPoint.timestamp || 0).getTime();
      const currTime = new Date(point.createdAt || point.timestamp || 0).getTime();
      const timeGapMinutes = (currTime - prevTime) / (1000 * 60);

      // Split into a new journey if time gap > 8 mins or segment >= 15 points
      if (timeGapMinutes > 8 || currentSegment.length >= 15) {
        segments.push(currentSegment);
        currentSegment = [point];
      } else {
        currentSegment.push(point);
      }
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments.map((seg, idx) => {
    const startPt = seg[0];
    const endPt = seg[seg.length - 1];

    const formatTimeStr = (rawTs?: string) => {
      if (!rawTs) return "";
      const d = new Date(rawTs);
      return !Number.isNaN(d.getTime())
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : rawTs;
    };

    const startPlace = getCleanName(startPt.address) || getCleanName(startPt.name) || "Start Location";
    const endPlace = getCleanName(endPt.address) || getCleanName(endPt.name) || "Destination";

    const mapboxCoords: MapboxPosition[] = seg.map((p) => [p.longitude, p.latitude]);
    const startCoord: MapboxPosition = [startPt.longitude, startPt.latitude];
    const endCoord: MapboxPosition = [endPt.longitude, endPt.latitude];

    // Calculate bounding box so BOTH start and end fit on the mini map
    const lats = seg.map((p) => p.latitude);
    const lngs = seg.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const latPad = latDiff === 0 ? 0.005 : latDiff * 0.25;
    const lngPad = lngDiff === 0 ? 0.005 : lngDiff * 0.25;

    const bounds = {
      ne: [maxLng + lngPad, maxLat + latPad] as MapboxPosition,
      sw: [minLng - lngPad, minLat - latPad] as MapboxPosition,
      paddingBottom: 35,
      paddingTop: 35,
      paddingLeft: 35,
      paddingRight: 35,
    };

    // Filter displayStops to consolidate 60 rapid GPS pings into key stops
    const displayStops: LocationHistoryItem[] = [];
    seg.forEach((pt, pIdx) => {
      if (pIdx === 0 || pIdx === seg.length - 1) {
        displayStops.push(pt);
      } else {
        const prev = displayStops[displayStops.length - 1];
        const pTime = new Date(prev.createdAt || prev.timestamp || 0).getTime();
        const cTime = new Date(pt.createdAt || pt.timestamp || 0).getTime();
        const gapMin = (cTime - pTime) / (1000 * 60);

        // Keep intermediate stops if time gap > 2 mins or if it has a clean custom name/address
        if (gapMin >= 2 || getCleanName(pt.address) || getCleanName(pt.name)) {
          displayStops.push(pt);
        }
      }
    });

    const title = startPlace !== endPlace ? `${startPlace} → ${endPlace}` : startPlace;

    return {
      id: `journey-${idx}-${startPt.id}`,
      title: `Journey ${idx + 1}: ${title}`,
      startTimeLabel: formatTimeStr(startPt.createdAt || startPt.timestamp),
      endTimeLabel: formatTimeStr(endPt.createdAt || endPt.timestamp),
      startPlace,
      endPlace,
      points: seg,
      displayStops,
      mapboxCoords,
      startCoord,
      endCoord,
      bounds,
    };
  });
}

// ─── Battery Indicator ────────────────────────────────────────────────────────
function BatteryIndicator({
  percent,
  updatedLabel,
  t,
  styles,
}: {
  percent: number | null;
  updatedLabel: string | null;
  t: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof createStyles>;
}) {
  const isLow = percent !== null && percent < LOW_BATTERY_THRESHOLD;
  const fillColor = isLow ? t.colors.error : t.colors.success;

  let formattedLabel = "";
  if (updatedLabel) {
    try {
      const d = new Date(updatedLabel);
      formattedLabel = Number.isNaN(d.getTime())
        ? updatedLabel
        : `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;
    } catch {
      formattedLabel = updatedLabel;
    }
  }

  return (
    <View style={styles.batteryRow}>
      <View>
        <Text style={styles.batteryLabel}>Battery</Text>
        {formattedLabel ? (
          <Text style={styles.batterySubLabel}>Updated {formattedLabel}</Text>
        ) : null}
      </View>
      <View style={styles.batteryRight}>
        <View style={styles.batteryShell}>
          <View
            style={[
              styles.batteryFill,
              {
                width: percent !== null ? `${percent}%` : "0%",
                backgroundColor:
                  percent !== null ? fillColor : t.colors.border,
              },
            ]}
          />
          <View style={styles.batteryCap} />
        </View>
        <Text
          style={[
            styles.batteryPercent,
            { color: percent !== null ? fillColor : t.colors.textTertiary },
          ]}
        >
          {percent !== null ? `${percent}%` : "—"}
        </Text>
      </View>
    </View>
  );
}

// ─── Individual Journey Card Component ─────────────────────────────────────────
function JourneyCard({
  journey,
  index,
  isDarkMode,
  t,
  styles,
}: {
  journey: JourneyGroup;
  index: number;
  isDarkMode: boolean;
  t: ReturnType<typeof useTheme>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.journeyCardContainer}>
      {/* Journey Card Header */}
      <View style={styles.journeyCardHeader}>
        <View style={styles.journeyBadge}>
          <Ionicons name="car-outline" size={14} color="#FFFFFF" />
          <Text style={styles.journeyBadgeText}>Trip #{index + 1}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.journeyTitle} numberOfLines={1}>
            {journey.title}
          </Text>
          <Text style={styles.journeyTimeRange}>
            {journey.startTimeLabel}
            {journey.endTimeLabel ? ` - ${journey.endTimeLabel}` : ""} • {journey.points.length} points ({journey.displayStops.length} stops)
          </Text>
        </View>
      </View>

      {/* Individual Journey Mini-Map (Fits BOTH Start & End Markers) */}
      <View style={styles.journeyMapWrapper}>
        <MapboxGL.MapView
          style={styles.journeyMap}
          styleURL={
            isDarkMode
              ? MapboxGL.StyleURL.Dark
              : MapboxGL.StyleURL.Street
          }
          scrollEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
          zoomEnabled={true}
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled={true}
          scaleBarEnabled={false}
        >
          {Platform.OS === 'android' && (
            <MapboxGL.RasterSource id="osmHistoryTileSource" tileSize={256} tileUrlTemplates={[OSM_TILE_URL]}>
              <MapboxGL.RasterLayer id="osmHistoryTileLayer" style={{ rasterOpacity: 1 }} />
            </MapboxGL.RasterSource>
          )}
          <MapboxGL.Camera
            bounds={journey.bounds}
            animationDuration={0}
          />

          {/* Route line for this specific journey */}
          {journey.mapboxCoords.length >= 2 ? (
            <MapboxGL.ShapeSource
              id={`route-${journey.id}`}
              shape={toLineStringGeoJSON(journey.mapboxCoords)}
            >
              <MapboxGL.LineLayer
                id={`line-${journey.id}`}
                style={{
                  lineColor: "#185FA5",
                  lineWidth: 4,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </MapboxGL.ShapeSource>
          ) : null}

          {/* Stylish Start Point Marker */}
          {journey.startCoord && (
            <MapboxGL.MarkerView
              id={`start-${journey.id}`}
              coordinate={journey.startCoord}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.stylishStartMarker}>
                <View style={styles.startMarkerBadge}>
                  <Ionicons name="flag-sharp" size={11} color="#FFFFFF" />
                  <Text style={styles.startMarkerText}>START</Text>
                </View>
                <View style={styles.startMarkerPinTail} />
              </View>
            </MapboxGL.MarkerView>
          )}

          {/* Stylish End Point Marker */}
          {journey.endCoord && (
            <MapboxGL.MarkerView
              id={`end-${journey.id}`}
              coordinate={journey.endCoord}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.stylishEndMarker}>
                <View style={styles.endMarkerBadge}>
                  <Ionicons name="location-sharp" size={11} color="#FFFFFF" />
                  <Text style={styles.endMarkerText}>END</Text>
                </View>
                <View style={styles.endMarkerPinTail} />
              </View>
            </MapboxGL.MarkerView>
          )}
        </MapboxGL.MapView>

        {/* Map overlay hint */}
        <View style={styles.mapZoomHint}>
          <Ionicons name="resize-outline" size={11} color={t.colors.textSecondary} />
          <Text style={styles.mapZoomHintText}>Pinch to zoom</Text>
        </View>
      </View>

      {/* Clean Timeline Stops (Consolidated milestones, NO raw placeholders, NO coords, NO circle ID) */}
      <View style={styles.journeyStopsContainer}>
        {journey.displayStops.map((pt, sIdx) => {
          const rawTs = pt.createdAt ?? pt.timestamp ?? "";
          const date = rawTs ? new Date(rawTs) : null;
          const timeLabel =
            date && !Number.isNaN(date.getTime())
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : rawTs;

          const isFirst = sIdx === 0;
          const isLast = sIdx === journey.displayStops.length - 1;

          const cleanAddr = getCleanName(pt.address) || getCleanName(pt.name);
          const addressLabel = cleanAddr || (isFirst ? journey.startPlace : isLast ? journey.endPlace : `Stop #${sIdx + 1}`);

          return (
            <View key={`pt-${pt.id}-${sIdx}`} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    isFirst && { backgroundColor: "#10B981" },
                    isLast && !isFirst && { backgroundColor: "#EF4444" },
                  ]}
                />
                {!isLast && <View style={styles.timelineConnector} />}
              </View>
              <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                <View style={styles.timelineTopRow}>
                  <Text style={styles.timelineAddress} numberOfLines={2}>
                    {addressLabel}
                  </Text>
                  <Text style={styles.timelineTime}>{timeLabel}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function LocationHistoryModal({
  isLocationHistoryModalVisible,
  handleCloseLocationHistoryModal,
  batteryUpdatedAtLabel,
  batteryLevelPercent,
  locationHistoryLoading,
  handleRefreshLocationHistory,
  locationHistoryActiveFilter,
  handleSelectLocationHistoryFilter,
  locationHistoryCustomStart,
  locationHistoryCustomEnd,
  handleCustomFilterStartChange,
  handleCustomFilterEndChange,
  locationHistoryFilterError,
  locationHistoryError,
  locationHistory,
  locationHistoryFilteredDescending,
  memberName,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const insets = useSafeAreaInsets();

  const isDarkMode =
    (t as any).mode === "dark" || (t as any).isDark === true;

  const rawList = locationHistoryFilteredDescending.length > 0
    ? locationHistoryFilteredDescending
    : locationHistory;

  // Group location history entries into individual journey cards
  const journeys = useMemo(
    () => groupPointsIntoJourneys(rawList),
    [rawList],
  );

  return (
    <Modal
      visible={isLocationHistoryModalVisible}
      transparent
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleCloseLocationHistoryModal}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleCloseLocationHistoryModal}
        />

        <View style={styles.card}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          <View style={styles.fixedSection}>
            {/* Header row */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Location history</Text>
                {memberName ? (
                  <Text style={styles.headerSubtitle}>{memberName}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseLocationHistoryModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={t.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Battery */}
            <BatteryIndicator
              percent={batteryLevelPercent}
              updatedLabel={batteryUpdatedAtLabel}
              t={t}
              styles={styles}
            />

            {/* Filter chips + refresh */}
            <View style={styles.filtersOuterRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersRow}
              >
                {LOCATION_HISTORY_FILTERS.map((filter) => {
                  const active = filter.key === locationHistoryActiveFilter;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() =>
                        handleSelectLocationHistoryFilter(filter.key)
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.refreshBtn,
                  locationHistoryLoading && styles.refreshBtnDisabled,
                ]}
                onPress={handleRefreshLocationHistory}
                disabled={locationHistoryLoading}
              >
                {locationHistoryLoading ? (
                  <ActivityIndicator size="small" color={t.colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={13} color={t.colors.primary} />
                    <Text style={styles.refreshBtnText}>Refresh</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Custom date range */}
            {locationHistoryActiveFilter === "custom" ? (
              <View style={styles.customRange}>
                <View style={styles.customInputBlock}>
                  <Text style={styles.customLabel}>Start (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="2025-01-01"
                    placeholderTextColor={t.colors.textTertiary}
                    value={locationHistoryCustomStart}
                    onChangeText={handleCustomFilterStartChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={
                      Platform.OS === "ios"
                        ? "numbers-and-punctuation"
                        : "default"
                    }
                  />
                </View>
                <View style={styles.customInputBlock}>
                  <Text style={styles.customLabel}>End (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.customInput}
                    placeholder="2025-12-31"
                    placeholderTextColor={t.colors.textTertiary}
                    value={locationHistoryCustomEnd}
                    onChangeText={handleCustomFilterEndChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={
                      Platform.OS === "ios"
                        ? "numbers-and-punctuation"
                        : "default"
                    }
                  />
                </View>
              </View>
            ) : null}

            {/* Filter error */}
            {locationHistoryFilterError ? (
              <Text style={styles.filterError}>
                {locationHistoryFilterError}
              </Text>
            ) : null}

            {/* API error banner */}
            {locationHistoryError ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="warning-outline"
                  size={14}
                  color={t.colors.error}
                />
                <Text style={styles.errorBannerText}>
                  {locationHistoryError}
                </Text>
              </View>
            ) : null}

            {journeys.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {journeys.length}{" "}
                  {journeys.length === 1 ? "journey" : "journeys"}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Scrollable Journey List ────────────────────────────────────────── */}
          <View
            style={[
              styles.listContainer,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            {/* First-load spinner */}
            {locationHistoryLoading && journeys.length === 0 ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={t.colors.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : null}

            {!locationHistoryLoading &&
            journeys.length === 0 &&
            !locationHistoryFilterError ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="map-marker-off-outline"
                  size={44}
                  color={t.colors.textTertiary}
                />
                <Text style={styles.emptyTitle}>No location data</Text>
                <Text style={styles.emptyText}>
                  No trips recorded for this time range.{"\n"}Try a different
                  filter or refresh.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRefreshLocationHistory}
                >
                  <Ionicons name="refresh" size={14} color={t.colors.primary} />
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Journeys List (Each journey has its own interactive mini-map) */}
            {journeys.length > 0 ? (
              <FlatList
                data={journeys}
                keyExtractor={(j) => j.id}
                renderItem={({ item, index }) => (
                  <JourneyCard
                    journey={item}
                    index={index}
                    isDarkMode={isDarkMode}
                    t={t}
                    styles={styles}
                  />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                scrollEnabled
                bounces={false}
                ListFooterComponent={
                  locationHistoryLoading && journeys.length > 0 ? (
                    <View style={styles.listFooterLoader}>
                      <ActivityIndicator size="small" color={t.colors.primary} />
                      <Text style={styles.listFooterText}>Updating...</Text>
                    </View>
                  ) : null
                }
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    card: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.xl,
      borderTopRightRadius: t.radius.xl,
      paddingTop: 12,
      maxHeight: "92%",
      flex: 1,
    },
    dragHandle: {
      width: 36,
      height: 4,
      backgroundColor: t.colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: t.space[4],
    },
    fixedSection: {
      paddingHorizontal: t.space[5],
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: t.space[4],
    },
    headerTitle: {
      fontSize: t.typography.size.lg,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: t.typography.size.sm,
      color: t.colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.hoverBg,
      alignItems: "center",
      justifyContent: "center",
    },

    // Battery
    batteryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.colors.backgroundAlt,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      marginBottom: t.space[4],
    },
    batteryLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: t.typography.tracking.wide,
    },
    batterySubLabel: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      marginTop: 2,
    },
    batteryRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[2],
    },
    batteryShell: {
      width: 46,
      height: 22,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      overflow: "hidden",
      position: "relative",
      backgroundColor: t.colors.surface,
    },
    batteryFill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: 3,
    },
    batteryCap: {
      position: "absolute",
      right: -5,
      top: "25%",
      width: 4,
      height: "50%",
      backgroundColor: t.colors.border,
      borderRadius: 2,
    },
    batteryPercent: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
    },

    filtersOuterRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: t.space[4],
    },
    filtersScroll: {
      flexGrow: 0,
      flexShrink: 1,
      height: 36,
    },
    filtersRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingRight: t.space[2],
    },
    chip: {
      height: 30,
      justifyContent: "center",
      paddingHorizontal: 10,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
    },
    chipActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    chipText: {
      fontSize: t.typography.size.xs,
      color: t.colors.textSecondary,
      fontWeight: t.typography.weight.medium,
    },
    chipTextActive: {
      color: t.colors.textOnPrimary,
    },
    refreshBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 30,
      paddingHorizontal: 10,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.primary,
      marginLeft: t.space[2],
      flexShrink: 0,
    },
    refreshBtnDisabled: {
      opacity: 0.5,
    },
    refreshBtnText: {
      fontSize: t.typography.size.xs,
      color: t.colors.primary,
      fontWeight: t.typography.weight.medium,
    },

    // Custom range
    customRange: {
      flexDirection: "row",
      gap: t.space[3],
      marginBottom: t.space[4],
    },
    customInputBlock: {
      flex: 1,
    },
    customLabel: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      marginBottom: 4,
    },
    customInput: {
      height: 38,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.border,
      paddingHorizontal: 10,
      fontSize: t.typography.size.sm,
      color: t.colors.textPrimary,
      backgroundColor: t.colors.backgroundAlt,
    },

    // Errors
    filterError: {
      fontSize: t.typography.size.sm,
      color: t.colors.error,
      marginBottom: t.space[3],
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: t.colors.errorBg ?? t.colors.backgroundAlt,
      borderRadius: t.radius.md,
      padding: t.space[3],
      marginBottom: t.space[3],
    },
    errorBannerText: {
      fontSize: t.typography.size.sm,
      color: t.colors.error,
      flex: 1,
    },

    // List header
    listHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: t.space[2],
      marginTop: 4,
    },
    listHeaderText: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: t.typography.tracking.wide,
    },

    listContainer: {
      flex: 1,
      minHeight: 120,
      paddingHorizontal: t.space[5],
    },
    listContent: {
      paddingBottom: t.space[4],
    },

    // Journey Card Styles
    journeyCardContainer: {
      backgroundColor: t.colors.backgroundAlt,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
      marginBottom: 16,
      overflow: "hidden",
    },
    journeyCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      backgroundColor: t.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    journeyBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: t.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    journeyBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    journeyTitle: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
    },
    journeyTimeRange: {
      fontSize: t.typography.size.xs,
      color: t.colors.textSecondary,
      marginTop: 2,
    },

    // Individual Journey Map
    journeyMapWrapper: {
      height: 185,
      width: "100%",
      position: "relative",
      backgroundColor: "#E5E7EB",
    },
    journeyMap: {
      ...StyleSheet.absoluteFillObject,
    },
    mapZoomHint: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: t.colors.surface,
      opacity: 0.9,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    mapZoomHintText: {
      fontSize: 10,
      color: t.colors.textSecondary,
      fontWeight: "500",
    },

    // Stylish Start and End Markers
    stylishStartMarker: {
      alignItems: "center",
    },
    startMarkerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#10B981",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 5,
    },
    startMarkerText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    startMarkerPinTail: {
      width: 0,
      height: 0,
      borderLeftWidth: 4,
      borderRightWidth: 4,
      borderTopWidth: 6,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: "#10B981",
      alignSelf: "center",
      marginTop: -1,
    },

    stylishEndMarker: {
      alignItems: "center",
    },
    endMarkerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#EF4444",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3,
      elevation: 5,
    },
    endMarkerText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.5,
    },
    endMarkerPinTail: {
      width: 0,
      height: 0,
      borderLeftWidth: 4,
      borderRightWidth: 4,
      borderTopWidth: 6,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: "#EF4444",
      alignSelf: "center",
      marginTop: -1,
    },

    // Journey Stops Timeline inside Journey Card
    journeyStopsContainer: {
      padding: 12,
      backgroundColor: t.colors.surface,
    },

    centerContent: {
      alignItems: "center",
      paddingVertical: t.space[8],
      gap: t.space[3],
    },
    loadingText: {
      fontSize: t.typography.size.md,
      color: t.colors.textTertiary,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: t.space[10],
      gap: t.space[2],
    },
    emptyTitle: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textPrimary,
      marginTop: 4,
    },
    emptyText: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
      textAlign: "center",
      lineHeight: t.typography.size.sm * t.typography.leading.normal,
    },
    retryButton: {
      marginTop: t.space[2],
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: t.space[5],
      paddingVertical: t.space[2] + 1,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primaryLight,
    },
    retryButtonText: {
      fontSize: t.typography.size.sm,
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
    },
    listFooterLoader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: t.space[3],
      gap: t.space[2],
    },
    listFooterText: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
    },

    // Timeline
    timelineRow: {
      flexDirection: "row",
      gap: t.space[3],
    },
    timelineLeft: {
      alignItems: "center",
      width: 16,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.primary,
      marginTop: 4,
      flexShrink: 0,
    },
    timelineConnector: {
      width: 1.5,
      flex: 1,
      backgroundColor: t.colors.border,
      marginVertical: 3,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: t.space[3],
    },
    timelineTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: t.space[2],
    },
    timelineAddress: {
      flex: 1,
      fontSize: t.typography.size.sm,
      color: t.colors.textPrimary,
      fontWeight: t.typography.weight.medium,
    },
    timelineTime: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      flexShrink: 0,
    },
  });
}