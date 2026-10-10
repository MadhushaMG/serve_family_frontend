import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import Mapbox from "@rnmapbox/maps";
import {
  FamilyMember,
  getBatteryColor,
  getStraightLineDistance,
  MY_LOCATION,
  openDirections,
  STATUS_COLORS,
  STATUS_LABELS,
  formatLastSeen,
} from "../../utils/mapUtils";
import { useSmoothMarkerAnimation } from "../utils/useAnimatedCoordinate";

const DEFAULT_AVATAR = require("../assets/images/man.png");

// ========================= SAVED PLACE MARKER ===============================
export const SavedPlaceMarker = ({
  coordinate,
  label,
  color = "#185FA5",
  cameraRef,
  id,
  accuracy = 0,
  activeMarkerId,
  onMarkerPress,
}: {
  coordinate: [number, number];
  label: string;
  color?: string;
  cameraRef?: React.RefObject<Mapbox.Camera>;
  id: string;
  accuracy?: number;
  activeMarkerId?: string | null;
  onMarkerPress?: (id: string | null) => void;
}) => {
  const [popupVisible, setPopupVisible] = useState(false);
 const { coordinate: animatedCoord } = useSmoothMarkerAnimation(coordinate, 800);

  const isActive = activeMarkerId === id;

  const circleGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    geometry: { type: "Point", coordinates: coordinate },
    properties: {},
  };

  const getZoomForAccuracy = (acc: number) => {
    if (acc >= 2000) return 13;
    if (acc >= 1000) return 14;
    if (acc >= 500) return 15;
    return 16;
  };

  const handlePress = useCallback(() => {
    cameraRef?.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: accuracy ? getZoomForAccuracy(accuracy) : 17,
      animationDuration: 600,
    });
    onMarkerPress?.(id);
    setPopupVisible(true);
  }, [cameraRef, coordinate, accuracy, id, onMarkerPress]);

  const handleClose = useCallback(() => {
    setPopupVisible(false);
    onMarkerPress?.(null);
  }, [onMarkerPress]);

  return (
    <>
      {isActive && (
        <Mapbox.ShapeSource id={`saved-acc-src-${id}`} shape={circleGeoJSON}>
          <Mapbox.CircleLayer
            id={`saved-acc-layer-${id}`}
            style={{
              circleRadius: [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                0,
                0,
                20,
                ["/", accuracy || 50, 0.075],
              ] as any,
              circleColor: color,
              circleOpacity: 0.12,
              circleStrokeWidth: 1.5,
              circleStrokeColor: color,
              circleStrokeOpacity: 0.35,
              circlePitchAlignment: "map",
            }}
          />
        </Mapbox.ShapeSource>
      )}

      <Mapbox.PointAnnotation
        id={`saved-place-${id}`}
        coordinate={animatedCoord}
        onSelected={handlePress}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={styles.markerContainer}
        >
          <View style={[styles.savedPinBody, { backgroundColor: color }]}>
            <View style={styles.savedPinDot} />
          </View>
          <View style={[styles.savedPinTail, { borderTopColor: color }]} />
        </TouchableOpacity>
      </Mapbox.PointAnnotation>

      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose}>
          <Pressable style={styles.popupCard} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.savedPlaceIcon,
                  { backgroundColor: color + "22" },
                ]}
              >
                <View
                  style={[styles.savedPlaceIconDot, { backgroundColor: color }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{label}</Text>
                <Text style={styles.onlineStatusText}>Saved Place</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.btnDirections}
                onPress={() => {
                  handleClose();
                  openDirections(coordinate[1], coordinate[0]);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ================================== SOS MARKER ===================================
export const SosMarker = ({
  coordinate,
  name,
  triggeredAt,
  type = "sos",
  cameraRef,
  id,
  activeMarkerId,
  onMarkerPress,
}: {
  coordinate: [number, number];
  name: string;
  triggeredAt: Date;
  type?: "sos" | "crash";
  cameraRef?: React.RefObject<Mapbox.Camera>;
  id: string;
  activeMarkerId?: string | null;
  onMarkerPress?: (id: string | null) => void;
}) => {
  const [popupVisible, setPopupVisible] = useState(false);
const { coordinate: animatedCoord } = useSmoothMarkerAnimation(coordinate, 800);
  const label = type === "crash" ? "CRASH" : "SOS";
  const accentColor = "#ef4444";

  const isActive = activeMarkerId === id;

  const circleGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    geometry: { type: "Point", coordinates: coordinate },
    properties: {},
  };

  const safeId = String(id ?? "").replace(/\s+/g, "-");

  const handlePress = useCallback(() => {
    cameraRef?.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 17,
      animationDuration: 600,
    });
    onMarkerPress?.(id);
    setPopupVisible(true);
  }, [cameraRef, coordinate, id, onMarkerPress]);

  const handleClose = useCallback(() => {
    setPopupVisible(false);
    onMarkerPress?.(null);
  }, [onMarkerPress]);

  return (
    <>
      {isActive && (
        <Mapbox.ShapeSource id={`sos-src-${safeId}`} shape={circleGeoJSON}>
          <Mapbox.CircleLayer
            id={`sos-layer-${safeId}`}
            style={{
              circleRadius: [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                0,
                0,
                20,
                40,
              ] as any,
              circleColor: accentColor,
              circleOpacity: 0.15,
              circleStrokeWidth: 2,
              circleStrokeColor: accentColor,
              circleStrokeOpacity: 0.5,
              circlePitchAlignment: "map",
            }}
          />
        </Mapbox.ShapeSource>
      )}

      <Mapbox.PointAnnotation
        id={`sos-annotation-${safeId}`}
        coordinate={animatedCoord}
        onSelected={handlePress}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={styles.markerContainer}
        >
          <View style={styles.sosPulseOuter}>
            <View style={styles.sosPulseInner}>
              <View style={styles.sosBody}>
                <Text style={styles.sosLabel}>{label}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.pinTail, { borderTopColor: accentColor }]} />
          <View
            style={[
              styles.nameLabel,
              { borderColor: accentColor, borderWidth: 1 },
            ]}
          >
            <Text
              style={[styles.nameLabelText, { color: accentColor }]}
              numberOfLines={1}
            >
              {name.split(" ")[0]}
            </Text>
          </View>
        </TouchableOpacity>
      </Mapbox.PointAnnotation>

      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose}>
          <Pressable style={styles.popupCard} onPress={() => {}}>
            <View
              style={[styles.sosAlertHeader, { backgroundColor: accentColor }]}
            >
              <Text style={styles.sosAlertTitle}>
                {type === "crash" ? "Crash Detected" : "SOS Alert"}
              </Text>
              <Text style={styles.sosAlertSub}>
                {name} · {formatLastSeen(triggeredAt)}
              </Text>
            </View>

            <View style={styles.cardHeader}>
              <View style={styles.sosCardIcon}>
                <Text style={styles.sosCardIconText}>{label}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{name}</Text>
                <Text style={[styles.onlineStatusText, { color: accentColor }]}>
                  {type === "crash"
                    ? "Crash detection triggered"
                    : "Emergency SOS triggered"}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.btnJourney, { backgroundColor: accentColor }]}
                onPress={() => {
                  handleClose();
                  openDirections(coordinate[1], coordinate[0]);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnJourneyText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

// ============================= FAMILY MEMBER MARKER =============================

export const CustomMarker = ({
  coordinate,
  name,
  profileImage,
  battery,
  speed,
  status,
  onlineStatus,
  lastSeen,
  accuracy = 50,
  cameraRef,
  id,
  activeMarkerId,
  onMarkerPress,
  onJourneyPress,
}: FamilyMember & {
  cameraRef?: React.RefObject<Mapbox.Camera>;
  activeMarkerId?: string | null;
  onMarkerPress?: (id: string | null) => void;
  onJourneyPress?: () => void;
}) => {
const { coordinate: animatedCoord } = useSmoothMarkerAnimation(coordinate, 800);

  const [popupVisible, setPopupVisible] = useState(false);
  const [imageError, setImageError] = useState(false);

  const statusColor = STATUS_COLORS[status];

  const safeBattery = Math.min(100, Math.max(0, battery ?? 0));
  const safeSpeed = speed ?? 0;

  const batteryColor = getBatteryColor(safeBattery);

  const isActive = activeMarkerId === id;

  const circleGeoJSON: GeoJSON.Feature<GeoJSON.Point> = {
    type: "Feature",
    geometry: { type: "Point", coordinates: coordinate },
    properties: {},
  };

  const memberLng = coordinate[0];
  const memberLat = coordinate[1];

  const distanceLabel = getStraightLineDistance(
    MY_LOCATION.latitude,
    MY_LOCATION.longitude,
    memberLat,
    memberLng,
  );

  const handlePress = useCallback(() => {
    cameraRef?.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 17,
      animationDuration: 600,
    });
    onMarkerPress?.(id);
    setPopupVisible(true);
  }, [cameraRef, coordinate, id, onMarkerPress]);

  const handleClose = useCallback(() => {
    setPopupVisible(false);
    onMarkerPress?.(null);
  }, [onMarkerPress]);

  const avatarUri =
    typeof profileImage === "string" && profileImage.trim().length > 0
      ? profileImage.trim()
      : null;
  const showRemoteAvatar = Boolean(avatarUri) && !imageError;
  const avatarSource = useMemo(
    () => (showRemoteAvatar ? { uri: avatarUri as string } : DEFAULT_AVATAR),
    [showRemoteAvatar, avatarUri],
  );
  const safeId = String(id ?? "").replace(/\s+/g, "-");

  useEffect(() => {
    setImageError(false);
  }, [avatarUri]);

  return (
    <>
      {isActive && (
        <Mapbox.ShapeSource
          id={`accuracy-src-${safeId}`}
          shape={circleGeoJSON}
        >
          <Mapbox.CircleLayer
            id={`accuracy-layer-${safeId}`}
            style={{
              circleRadius: [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                0,
                0,
                20,
                ["/", accuracy, 0.075],
              ] as any,
              circleColor: statusColor,
              circleOpacity: 0.12,
              circleStrokeWidth: 1.5,
              circleStrokeColor: statusColor,
              circleStrokeOpacity: 0.35,
              circlePitchAlignment: "map",
            }}
          />
        </Mapbox.ShapeSource>
      )}

      <Mapbox.MarkerView
        id={`marker-${safeId}`}
        coordinate={animatedCoord}
        anchor={{ x: 0.5, y: 1 }}
        allowOverlap
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={styles.markerContainer}
        >
          <View style={styles.batteryBadge}>
            <Text style={styles.batteryBadgeText}>{safeSpeed}KM/H</Text>
          </View>

          <View style={[styles.avatarRing, { borderColor: statusColor }]}>
            <Image
              key={showRemoteAvatar ? avatarUri : "default-avatar"}
              source={avatarSource}
              style={styles.avatarImage}
              resizeMode="cover"
              fadeDuration={0}
              onError={() => {
                if (showRemoteAvatar) setImageError(true);
              }}
            />
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
          </View>

          <View style={[styles.pinTail, { borderTopColor: statusColor }]} />

          <View style={styles.nameLabel}>
            <Text style={styles.nameLabelText} numberOfLines={1}>
              {name.split(" ")[0]}
            </Text>
          </View>
        </TouchableOpacity>
      </Mapbox.MarkerView>

      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={handleClose}>
          <Pressable style={styles.popupCard} onPress={() => {}}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardAvatar, { borderColor: statusColor }]}>
                <Image
                  source={avatarSource}
                  style={styles.cardAvatarImage}
                  resizeMode="cover"
                  onError={() => {
                    if (showRemoteAvatar) setImageError(true);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{name}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          status === "online"
                            ? "#EAF3DE"
                            : status === "idle"
                              ? "#FAEEDA"
                              : "#F1EFE8",
                      },
                    ]}
                  >
                    <View
                      style={[styles.pillDot, { backgroundColor: statusColor }]}
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            status === "online"
                              ? "#3B6D11"
                              : status === "idle"
                                ? "#854F0B"
                                : "#5F5E5A",
                        },
                      ]}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </View>
                  <Text style={styles.onlineStatusText}>{onlineStatus}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statCell}>
                <Text style={styles.statVal}>
                  {Math.round(safeSpeed)}{" "}
                  <Text style={styles.statUnit}>km/h</Text>
                </Text>
                <Text style={styles.statLbl}>Speed</Text>
              </View>
              <View style={[styles.statCell, styles.statCellBorder]}>
                <View style={styles.battWrap}>
                  <View style={styles.battBox}>
                    <View
                      style={[
                        styles.battFill,
                        {
                          width: `${safeBattery}%` as any,
                          backgroundColor: batteryColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.battTip} />
                </View>
                <Text style={styles.statVal}>{safeBattery}%</Text>
                <Text style={styles.statLbl}>Battery</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.lastSeenText}>
                Last seen: {lastSeen}
              </Text>
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.btnJourney}
                onPress={() => {
                  handleClose();
                  onJourneyPress?.();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnJourneyText}>Journey</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDirections}
                onPress={() => {
                  handleClose();
                  openDirections(memberLat, memberLng);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnDirectionsText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};


// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
  },

  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    position: "relative",
    overflow: "visible",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E6F1FB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "500",
    color: "#185FA5",
  },
  statusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },

  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },

  nameLabel: {
    marginTop: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.12)",
  },
  nameLabelText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#1a1a1a",
  },

  batteryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20,20,20,0.82)",
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
    marginBottom: 4,
  },
  batteryIconWrap: {
    width: 18,
    height: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 2,
    overflow: "hidden",
  },
  batteryFillSmall: {
    height: "100%",
  },
  batteryTipSmall: {
    width: 2,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  batteryBadgeText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#fff",
  },

  savedPinBody: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  savedPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  savedPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
  },
  savedPlaceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  savedPlaceIconDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },

  gpsDeviceBody: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  gpsIconOuter: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(24,95,165,0.25)",
  },
  gpsIconInner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(24,95,165,0.45)",
  },
  gpsIconDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsDeviceCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "#E6F1FB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  gpsIconOuterSm: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "rgba(24,95,165,0.25)",
  },
  gpsIconInnerSm: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(24,95,165,0.5)",
  },
  gpsIconDotSm: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  sosPulseOuter: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosPulseInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: "rgba(239,68,68,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  sosBody: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  sosLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  sosAlertHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  sosAlertTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  sosAlertSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  sosCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  sosCardIconText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  popupCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  cardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    backgroundColor: "#E6F1FB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardAvatarImage: {
    width: 48,
    height: 48,
  },
  cardAvatarInitials: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0C447C",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  onlineStatusText: {
    fontSize: 12,
    color: "#888",
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 14,
    color: "#888",
  },

  statGrid: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  statCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  statCellBorder: {
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
    marginTop: 4,
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: "#888",
  },
  statLbl: {
    fontSize: 10,
    color: "#888",
  },
  battWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  battBox: {
    width: 28,
    height: 12,
    borderWidth: 1.5,
    borderColor: "#aaa",
    borderRadius: 2,
    overflow: "hidden",
  },
  battFill: {
    height: "100%",
  },
  battTip: {
    width: 3,
    height: 6,
    backgroundColor: "#aaa",
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },

  cardFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastSeenText: {
    fontSize: 11,
    color: "#888",
  },
  distanceText: {
    fontSize: 11,
    color: "#185FA5",
    fontWeight: "500",
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  btnJourney: {
    flex: 1,
    backgroundColor: "#185FA5",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnJourneyText: {
    color: "#E6F1FB",
    fontSize: 13,
    fontWeight: "500",
  },
  btnDirections: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  btnDirectionsText: {
    color: "#1a1a1a",
    fontSize: 13,
    fontWeight: "500",
  },
});