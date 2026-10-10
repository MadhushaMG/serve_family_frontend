import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Phone, MapPin, Navigation, CheckCircle2, Play, Flag, Compass, Clock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIncomingBookingStore } from "@/src/store/useIncomingBookingStore";
import apiClient from "@/src/api/apiClient";
import { RideReceiptModal } from "./RideReceiptModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const DriverActiveRideModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeDriverRide, isUpdatingStatus, updateDriverStatus } = useIncomingBookingStore();
  const [completedBookingId, setCompletedBookingId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState<boolean>(false);

  // Waiting mode state
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [waitingSeconds, setWaitingSeconds] = useState<number>(0);
  const [accumulatedMinutes, setAccumulatedMinutes] = useState<number>(0);
  const [accumulatedFare, setAccumulatedFare] = useState<number>(0);
  const [isTogglingWaiting, setIsTogglingWaiting] = useState<boolean>(false);

  // Timer for active waiting mode
  useEffect(() => {
    let timer: any = null;
    if (isWaiting) {
      timer = setInterval(() => {
        setWaitingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWaiting]);

  // Reset waiting state on booking completion or change
  useEffect(() => {
    if (!activeDriverRide) {
      setIsWaiting(false);
      setWaitingSeconds(0);
      setAccumulatedMinutes(0);
      setAccumulatedFare(0);
    }
  }, [activeDriverRide?.bookingId]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleWaiting = async () => {
    if (!activeDriverRide?.bookingData?.bookingId) return;
    const bookingId = activeDriverRide.bookingData.bookingId;
    const nextState = !isWaiting;
    setIsTogglingWaiting(true);
    try {
      const res: any = await apiClient.patch("/taxi/waiting", {
        bookingId,
        isWaiting: nextState,
      });
      setIsWaiting(nextState);
      if (nextState) {
        setWaitingSeconds(0);
      } else {
        const booking = res?.data?.booking || res?.booking;
        if (booking) {
          if (booking.waitingMinutes) setAccumulatedMinutes(booking.waitingMinutes);
          if (booking.waitingFare) setAccumulatedFare(booking.waitingFare);
        }
      }
    } catch (err: any) {
      console.warn("Toggle waiting mode error:", err?.message || err);
      Alert.alert("Waiting Mode", "Could not toggle waiting mode. Please check connection.");
    } finally {
      setIsTogglingWaiting(false);
    }
  };

  // Live GPS coordinate streaming to backend while driver is on active trip
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    async function startLiveLocationStream() {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') return;

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            try {
              await apiClient.patch('/taxi/location', {
                latitude,
                longitude,
                isActive: true,
              });
              console.log(`📡 [DriverLocationStream] Streamed coordinates: (${latitude}, ${longitude})`);
            } catch (e) {
              console.warn('[DriverLocationStream] Error streaming location', e);
            }
          }
        );
      } catch (err) {
        console.warn('[DriverLocationStream] Error watching position', err);
      }
    }

    if (activeDriverRide) {
      startLiveLocationStream();
    }

    return () => {
      locationSubscription?.remove();
    };
  }, [activeDriverRide]);

  if (!activeDriverRide && !showReceipt) return null;

  const status = activeDriverRide?.status;
  const bookingData = activeDriverRide?.bookingData;

  // Launch Google Maps for Navigation
  const handleOpenNavigation = () => {
    if (!bookingData) return;
    let lat = bookingData.pickupLat;
    let lng = bookingData.pickupLng;

    if (status === "started" && bookingData.dropoffLat && bookingData.dropoffLng) {
      lat = bookingData.dropoffLat;
      lng = bookingData.dropoffLng;
    }

    if (lat && lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}`,
      });
      Linking.openURL(url || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    } else {
      const dest = status === "started" ? bookingData.dropoffLocation : bookingData.pickupLocation;
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`);
    }
  };

  // Call Passenger
  const handleCallPassenger = () => {
    if (bookingData?.customerPhone) {
      Linking.openURL(`tel:${bookingData.customerPhone}`);
    } else {
      Alert.alert("Contact Passenger", "Passenger phone number is not available.");
    }
  };

  // Status Action Handler
  const handleStatusAction = async () => {
    if (!activeDriverRide) return;
    if (status === "accepted") {
      await updateDriverStatus("arrived");
    } else if (status === "arrived") {
      await updateDriverStatus("started");
    } else if (status === "started") {
      const bId = activeDriverRide.bookingData.bookingId;
      setIsWaiting(false);
      setWaitingSeconds(0);
      await updateDriverStatus("completed");
      if (bId) {
        setCompletedBookingId(bId);
        setShowReceipt(true);
      }
    }
  };

  // UI labels based on current stage
  let badgeColor = "#2563EB";
  let badgeText = "EN ROUTE TO PICKUP";
  let buttonColor = "#16A34A"; // Green
  let buttonLabel = "ARRIVED AT PICKUP";
  let ButtonIcon = CheckCircle2;

  if (status === "arrived") {
    badgeColor = "#D97706";
    badgeText = "ARRIVED AT PICKUP LOCATION";
    buttonColor = "#2563EB"; // Blue
    buttonLabel = "START TRIP";
    ButtonIcon = Play;
  } else if (status === "started") {
    badgeColor = "#059669";
    badgeText = "TRIP IN PROGRESS";
    buttonColor = "#DC2626"; // Red
    buttonLabel = "COMPLETE TRIP";
    ButtonIcon = Flag;
  }

  return (
    <>
      {activeDriverRide && bookingData && (
        <Modal
          transparent
          visible={Boolean(activeDriverRide)}
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => {}}
        >
          <View style={styles.overlay}>
            <View style={[styles.cardContainer, { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "ios" ? 36 : 24) }]}>
              {/* Header Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
                <Text style={styles.statusBadgeText}>{badgeText}</Text>
              </View>

              {/* Passenger Info Row */}
              <View style={styles.passengerCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {bookingData.customerName ? bookingData.customerName.charAt(0).toUpperCase() : "P"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.passengerName}>{bookingData.customerName || "Passenger"}</Text>
                  <Text style={styles.fareText}>Fare: Rs. {bookingData.fare}</Text>
                </View>

                {/* Navigation & Call Actions */}
                <View style={styles.actionIconButtonRow}>
                  <TouchableOpacity
                    style={styles.navIconButton}
                    onPress={handleOpenNavigation}
                    activeOpacity={0.8}
                  >
                    <Compass size={20} color="#2563EB" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callIconButton}
                    onPress={handleCallPassenger}
                    activeOpacity={0.8}
                  >
                    <Phone size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Route Info */}
              <View style={styles.routeCard}>
                <View style={styles.locationRow}>
                  <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locLabel}>PICKUP LOCATION</Text>
                    <Text style={styles.locValue} numberOfLines={2}>
                      {bookingData.pickupLocation}
                    </Text>
                  </View>
                </View>

                <View style={styles.connector} />

                <View style={styles.locationRow}>
                  <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.locLabel}>DROP-OFF LOCATION</Text>
                    <Text style={styles.locValue} numberOfLines={2}>
                      {bookingData.dropoffLocation}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Waiting Mode Card (Available when arrived or started) */}
              {(status === "arrived" || status === "started") && (
                <View style={[styles.waitingCard, isWaiting && styles.waitingCardActive]}>
                  <View style={styles.waitingInfo}>
                    <View style={[styles.waitingIconWrap, isWaiting && styles.waitingIconWrapActive]}>
                      <Clock size={20} color={isWaiting ? "#DC2626" : "#64748B"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.waitingTitle, isWaiting && styles.waitingTitleActive]}>
                          {isWaiting ? "Waiting Mode Active" : "Waiting Mode"}
                        </Text>
                        {isWaiting && <View style={styles.waitingLiveDot} />}
                      </View>
                      <Text style={styles.waitingSubText}>
                        {isWaiting
                          ? `Elapsed: ${formatTime(waitingSeconds)}${accumulatedFare > 0 ? ` • +Rs. ${accumulatedFare}` : ""}`
                          : accumulatedMinutes > 0
                          ? `${accumulatedMinutes} mins recorded (+Rs. ${accumulatedFare})`
                          : "Track passenger waiting time & fare"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.waitingToggleBtn,
                      isWaiting ? styles.waitingToggleBtnStop : styles.waitingToggleBtnStart,
                    ]}
                    onPress={handleToggleWaiting}
                    disabled={isTogglingWaiting}
                    activeOpacity={0.8}
                  >
                    {isTogglingWaiting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.waitingToggleBtnText}>
                        {isWaiting ? "STOP WAITING" : "START WAITING"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Dynamic Stage Action Button */}
              <TouchableOpacity
                style={[styles.mainActionButton, { backgroundColor: buttonColor }]}
                onPress={handleStatusAction}
                disabled={isUpdatingStatus}
                activeOpacity={0.85}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <ButtonIcon size={24} color="#FFF" />
                    <Text style={styles.mainActionButtonText}>{buttonLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <RideReceiptModal
        visible={showReceipt}
        bookingId={completedBookingId}
        onClose={() => {
          setShowReceipt(false);
          setCompletedBookingId(null);
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    elevation: 25,
  },
  statusBadge: {
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  passengerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  fareText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
    marginTop: 2,
  },
  actionIconButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  navIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  callIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  routeCard: {
    backgroundColor: "#F1F5F9",
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 10,
  },
  connector: {
    width: 2,
    height: 18,
    backgroundColor: "#CBD5E1",
    marginLeft: 4,
    marginVertical: 4,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  locValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 2,
  },
  mainActionButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    elevation: 4,
  },
  mainActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  waitingCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waitingCardActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  waitingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  waitingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  waitingIconWrapActive: {
    backgroundColor: "#FEE2E2",
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  waitingTitleActive: {
    color: "#DC2626",
  },
  waitingLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  waitingSubText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  waitingToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 100,
  },
  waitingToggleBtnStart: {
    backgroundColor: "#475569",
  },
  waitingToggleBtnStop: {
    backgroundColor: "#DC2626",
  },
  waitingToggleBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
