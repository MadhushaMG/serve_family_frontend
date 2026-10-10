import React, { useEffect, useRef, useCallback, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useTheme } from "@/src/constants/theme";
import {
  useTaxiMeterStore,
  MeterStatus,
  LocationPoint,
  formatTime,
} from "@/src/store/useTaxiMeterStore";
import { TaxiMeterNotificationService } from "@/src/Services/TaxiMeterNotificationService";
import {
  startTaxiMeterBackgroundTask,
  stopTaxiMeterBackgroundTask,
} from "@/src/Services/TaxiMeterBackgroundTask";

interface TaxiMeterModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Calculates geodesic distance between two GPS points in meters using Haversine formula
 */
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TaxiMeterModal({ visible, onClose }: TaxiMeterModalProps) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  // Global Meter Store State & Actions
  const {
    status,
    distanceMeters,
    elapsedSeconds,
    currentSpeedKmH,
    baseFare,
    ratePerKm,
    liveFare,
    startMeter,
    pauseMeter,
    resumeMeter,
    stopMeter,
    resetMeter,
    updateLocation,
    incrementTime,
    setOverlayActive,
  } = useTaxiMeterStore();

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<any>(null);

  // ── 1. Stopwatch Timer Effect ─────────────────────────────────────────────
  useEffect(() => {
    if (status === "running") {
      // Synchronize immediately when running
      useTaxiMeterStore.getState().syncElapsedTime();
      timerRef.current = setInterval(() => {
        useTaxiMeterStore.getState().syncElapsedTime();
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ── 2. GPS Location Watcher Effect ─────────────────────────────────────────
  useEffect(() => {
    let active = true;

    const startLocationWatch = async () => {
      if (status !== "running") return;

      try {
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== "granted") {
          Alert.alert(
            "Location Permission Required",
            "Please allow location access to calculate meter distance."
          );
          pauseMeter();
          return;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (loc) => {
            if (!active) return;

            const newPoint: LocationPoint = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              speed: loc.coords.speed,
            };

            // Ignore inaccurate GPS noise (>25m accuracy)
            if (loc.coords.accuracy && loc.coords.accuracy > 25) {
              return;
            }

            // Speed in km/h
            const speedKmH =
              loc.coords.speed != null && loc.coords.speed >= 0
                ? Math.round(loc.coords.speed * 3.6)
                : 0;

            const lastPoint = useTaxiMeterStore.getState().lastLocation;

            if (lastPoint) {
              const dist = getDistanceMeters(
                lastPoint.latitude,
                lastPoint.longitude,
                newPoint.latitude,
                newPoint.longitude
              );

              // Filter out micro-movements under 1.5m and GPS drift while stationary (speed < 1 km/h)
              if (dist >= 1.5 && speedKmH >= 1) {
                updateLocation(newPoint, dist, speedKmH);
              } else {
                updateLocation(lastPoint, 0, speedKmH);
              }
            } else {
              updateLocation(newPoint, 0, speedKmH);
            }
          }
        );

        locationSubscriptionRef.current = sub;
      } catch (err) {
        console.warn("Failed to start location watcher for taxi meter", err);
      }
    };

    if (status === "running") {
      startLocationWatch();
    } else {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    }

    return () => {
      active = false;
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [status, updateLocation, pauseMeter]);

  // ── 3. Background / AppState & Notification Synchronization ────────────────
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const currentStatus = useTaxiMeterStore.getState().status;
      if (currentStatus === "running" || currentStatus === "paused") {
        if (nextState === "background" || nextState === "inactive") {
          // App minimized or call received -> Show Floating Widget & Ongoing Notification
          setOverlayActive(true);
          TaxiMeterNotificationService.updateRunningNotification(liveFare, distanceMeters, elapsedSeconds, currentStatus);
        } else if (nextState === "active") {
          // App returned to foreground -> Sync elapsed time immediately
          useTaxiMeterStore.getState().syncElapsedTime();
          TaxiMeterNotificationService.updateRunningNotification(liveFare, distanceMeters, elapsedSeconds, currentStatus);
        }
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      sub.remove();
    };
  }, [liveFare, distanceMeters, elapsedSeconds, setOverlayActive]);

  // Update notification live as fare changes & start/stop background location task
  useEffect(() => {
    if (status === "running") {
      startTaxiMeterBackgroundTask();
      TaxiMeterNotificationService.updateRunningNotification(liveFare, distanceMeters, elapsedSeconds, status);
    } else if (status === "paused") {
      TaxiMeterNotificationService.updateRunningNotification(liveFare, distanceMeters, elapsedSeconds, status);
    } else if (status === "stopped" || status === "idle") {
      stopTaxiMeterBackgroundTask();
      TaxiMeterNotificationService.dismissRunningNotification();
    }
  }, [status, liveFare, distanceMeters, elapsedSeconds]);

  // ── 4. Notification Click Listener ───────────────────────────────────────
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === "taxi-meter" || data?.action === "open_meter") {
        useTaxiMeterStore.getState().setModalVisible(true);
      }
    });

    return () => {
      responseSub.remove();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="arrow-back" size={22} color={t.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Digital Taxi Meter</Text>
            <Text style={styles.headerSubtitle}>Real-time GPS Distance & Fare</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(status)]}>
            <View style={[styles.statusDot, getStatusDotStyle(status)]} />
            <Text style={styles.statusBadgeText}>{status.toUpperCase()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Digital Meter Display */}
          <View style={styles.meterCard}>
            <View style={styles.meterHeaderRow}>
              <MaterialCommunityIcons name="calculator-variant" size={20} color="#16A34A" />
              <Text style={styles.meterCardTitle}>TOTAL FARE</Text>
            </View>

            {/* Glowing Digital Fare */}
            <View style={styles.fareDisplayBox}>
              <Text style={styles.currencySymbol}>LKR</Text>
              <Text style={styles.fareAmount}>{liveFare.toFixed(2)}</Text>
            </View>

            {/* Fare Calculation Subtext */}
            <Text style={styles.fareRuleSubtext}>
              Base LKR {baseFare} + LKR 10 per 100m step
            </Text>

            {/* Live Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Distance */}
              <View style={styles.metricItem}>
                <Ionicons name="resize-outline" size={20} color="#2563EB" />
                <Text style={styles.metricValue}>
                  {(distanceMeters / 1000).toFixed(2)} <Text style={styles.metricUnit}>km</Text>
                </Text>
                <Text style={styles.metricLabel}>Distance ({Math.round(distanceMeters)}m)</Text>
              </View>

              {/* Duration */}
              <View style={styles.metricItem}>
                <Ionicons name="time-outline" size={20} color="#D97706" />
                <Text style={styles.metricValue}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.metricLabel}>Duration</Text>
              </View>

              {/* Speed */}
              <View style={styles.metricItem}>
                <Ionicons name="speedometer-outline" size={20} color="#DC2626" />
                <Text style={styles.metricValue}>
                  {currentSpeedKmH} <Text style={styles.metricUnit}>km/h</Text>
                </Text>
                <Text style={styles.metricLabel}>Current Speed</Text>
              </View>
            </View>
          </View>

          {/* Driver Controls Bar */}
          <View style={styles.controlsCard}>
            <Text style={styles.controlsTitle}>METER CONTROLS</Text>
            <View style={styles.controlsBtnRow}>
              {status === "idle" && (
                <TouchableOpacity style={[styles.controlBtn, styles.btnStart]} onPress={startMeter}>
                  <Ionicons name="play" size={24} color="#FFFFFF" />
                  <Text style={styles.controlBtnText}>START METER</Text>
                </TouchableOpacity>
              )}

              {status === "running" && (
                <>
                  <TouchableOpacity style={[styles.controlBtn, styles.btnPause]} onPress={pauseMeter}>
                    <Ionicons name="pause" size={22} color="#FFFFFF" />
                    <Text style={styles.controlBtnText}>PAUSE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, styles.btnStop]} onPress={stopMeter}>
                    <Ionicons name="square" size={20} color="#FFFFFF" />
                    <Text style={styles.controlBtnText}>STOP & BILL</Text>
                  </TouchableOpacity>
                </>
              )}

              {status === "paused" && (
                <>
                  <TouchableOpacity style={[styles.controlBtn, styles.btnResume]} onPress={resumeMeter}>
                    <Ionicons name="play" size={22} color="#FFFFFF" />
                    <Text style={styles.controlBtnText}>RESUME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.controlBtn, styles.btnStop]} onPress={stopMeter}>
                    <Ionicons name="square" size={20} color="#FFFFFF" />
                    <Text style={styles.controlBtnText}>STOP & BILL</Text>
                  </TouchableOpacity>
                </>
              )}

              {status === "stopped" && (
                <TouchableOpacity style={[styles.controlBtn, styles.btnReset]} onPress={resetMeter}>
                  <Ionicons name="refresh" size={22} color="#FFFFFF" />
                  <Text style={styles.controlBtnText}>NEW TRIP (RESET)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Trip Summary / Bill Receipt when Stopped */}
          {status === "stopped" && (
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Ionicons name="receipt-outline" size={22} color="#16A34A" />
                <Text style={styles.receiptTitle}>Trip Summary Receipt</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Initial Base Fare</Text>
                <Text style={styles.receiptVal}>LKR {baseFare.toFixed(2)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Distance Traveled</Text>
                <Text style={styles.receiptVal}>
                  {(distanceMeters / 1000).toFixed(2)} km ({Math.round(distanceMeters)}m)
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Distance Fare (LKR 10 / 100m)</Text>
                <Text style={styles.receiptVal}>
                  LKR {(liveFare - baseFare).toFixed(2)}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Trip Duration</Text>
                <Text style={styles.receiptVal}>{formatTime(elapsedSeconds)}</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>TOTAL PAYABLE</Text>
                <Text style={styles.receiptTotalVal}>LKR {liveFare.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Badge Styling Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusBadgeStyle(status: MeterStatus) {
  switch (status) {
    case "running":
      return { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" };
    case "paused":
      return { backgroundColor: "#FEF3C7", borderColor: "#FDE047" };
    case "stopped":
      return { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" };
    default:
      return { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" };
  }
}

function getStatusDotStyle(status: MeterStatus) {
  switch (status) {
    case "running":
      return { backgroundColor: "#16A34A" };
    case "paused":
      return { backgroundColor: "#D97706" };
    case "stopped":
      return { backgroundColor: "#DC2626" };
    default:
      return { backgroundColor: "#64748B" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: "#FFFFFF",
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitleWrap: {
      flex: 1,
      marginLeft: 12,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: "#0F172A",
    },
    headerSubtitle: {
      fontSize: 12,
      color: "#64748B",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      gap: 6,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: "800",
      color: "#0F172A",
    },

    scrollContent: {
      padding: 16,
      gap: 16,
    },

    meterCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 4,
    },
    meterHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    meterCardTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#64748B",
      letterSpacing: 0.8,
    },
    fareDisplayBox: {
      backgroundColor: "#0F172A",
      borderRadius: 16,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    currencySymbol: {
      fontSize: 20,
      fontWeight: "700",
      color: "#16A34A",
      marginTop: 6,
    },
    fareAmount: {
      fontSize: 44,
      fontWeight: "900",
      color: "#22C55E",
      letterSpacing: 1,
      fontVariant: ["tabular-nums"],
    },
    fareRuleSubtext: {
      fontSize: 12,
      color: "#64748B",
      textAlign: "center",
      marginBottom: 16,
    },

    metricsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#F8FAFC",
      borderRadius: 14,
      padding: 12,
      gap: 8,
    },
    metricItem: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: "800",
      color: "#0F172A",
      marginTop: 4,
    },
    metricUnit: {
      fontSize: 11,
      fontWeight: "600",
      color: "#64748B",
    },
    metricLabel: {
      fontSize: 10,
      color: "#64748B",
      marginTop: 2,
    },

    controlsCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    controlsTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#64748B",
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    controlsBtnRow: {
      flexDirection: "row",
      gap: 10,
    },
    controlBtn: {
      flex: 1,
      height: 50,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    btnStart: {
      backgroundColor: "#16A34A",
    },
    btnPause: {
      backgroundColor: "#D97706",
    },
    btnResume: {
      backgroundColor: "#16A34A",
    },
    btnStop: {
      backgroundColor: "#DC2626",
    },
    btnReset: {
      backgroundColor: "#475569",
    },
    controlBtnText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },

    receiptCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: "#BBF7D0",
      backgroundColor: "#F0FDF4",
    },
    receiptHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    receiptTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: "#166534",
    },
    receiptRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    receiptLabel: {
      fontSize: 13,
      color: "#475569",
    },
    receiptVal: {
      fontSize: 13,
      fontWeight: "700",
      color: "#0F172A",
    },
    receiptDivider: {
      height: 1,
      backgroundColor: "#86EFAC",
      marginVertical: 10,
    },
    receiptTotalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    receiptTotalLabel: {
      fontSize: 14,
      fontWeight: "900",
      color: "#166534",
    },
    receiptTotalVal: {
      fontSize: 22,
      fontWeight: "900",
      color: "#15803D",
    },
  });
}
