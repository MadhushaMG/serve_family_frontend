import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Phone,
  Car,
  X,
  CheckCircle2,
  BellRing,
  Search,
  Navigation,
  XCircle,
  XOctagon,
  RotateCw,
  Receipt,
  Check,
  Lock,
  Star,
  Clock,
} from "lucide-react-native";
import { useActiveBookingStore } from "@/src/store/useActiveBookingStore";
import apiClient from "@/src/api/apiClient";
import { RideReceiptModal } from "./RideReceiptModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const CustomerRideTrackingModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { activeBookingData, activeBookingId, clearActiveBooking } = useActiveBookingStore();
  const [userRating, setUserRating] = useState<number>(5);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);

  const handleSelectRating = async (stars: number) => {
    setUserRating(stars);
    if (activeBookingId) {
      try {
        await apiClient.post(`/taxi/booking/${activeBookingId}/review`, {
          rating: stars,
        });
        setRatingSubmitted(true);
        console.log(`⭐ Saved ${stars}-star rating for booking ${activeBookingId}`);
      } catch (err: any) {
        console.warn("Auto-save star rating warning:", err?.message || err);
      }
    }
  };

  const handleDoneWithRating = async () => {
    if (activeBookingId && userRating > 0 && !ratingSubmitted) {
      setIsSubmittingRating(true);
      try {
        await apiClient.post(`/taxi/booking/${activeBookingId}/review`, {
          rating: userRating,
        });
        setRatingSubmitted(true);
        console.log(`⭐ Submitted ${userRating}-star rating for booking ${activeBookingId}`);
      } catch (err: any) {
        console.warn("Rating submission warning:", err?.message || err);
      } finally {
        setIsSubmittingRating(false);
      }
    }
    await clearActiveBooking();
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.3)).current;

  const status = activeBookingData?.status || "pending";
  const vehicle = activeBookingData?.vehicle;

  // Radar Pulse Animation & Progress Bar Animation
  useEffect(() => {
    if (status === "pending") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }

    if (status === "pending" || status === "started" || status === "in_transit") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 0.9,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [status]);

  if (!activeBookingId || !activeBookingData) return null;

  // Driver Name Fallback depending on status
  const getDriverName = () => {
    if (vehicle?.driverName) return vehicle.driverName;
    switch (status) {
      case "accepted":
        return "Driver Connected";
      case "arrived":
        return "Driver Waiting";
      case "started":
      case "in_transit":
        return "Driver On The Way";
      case "completed":
        return "Trip Driver";
      default:
        return "Driver Assigned";
    }
  };

  // Cancel ride handler
  const handleCancelRide = () => {
    Alert.alert(
      "Cancel Booking?",
      "Are you sure you want to cancel this ride request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              if (activeBookingId) {
                await apiClient
                  .patch(`/taxi/booking/${activeBookingId}/cancel`)
                  .catch(() => apiClient.post(`/taxi/booking/${activeBookingId}/cancel`))
                  .catch(() => apiClient.delete(`/taxi/booking/${activeBookingId}`))
                  .catch(() => {});
              }
            } catch (e) {
              console.warn("Cancel API error:", e);
            } finally {
              await clearActiveBooking();
            }
          },
        },
      ]
    );
  };

  // Call Driver handler
  const handleCallDriver = () => {
    const phone = vehicle?.driverPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("Contact Driver", "Driver phone number is not available.");
    }
  };

  // Show Receipt handler
  const handleShowReceipt = () => {
    setShowReceiptModal(true);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // PickMe Status Theme Config
  const getThemeConfig = () => {
    switch (status) {
      case "accepted":
        return {
          gradient: ["#22C55E", "#15803D"] as const,
          Icon: CheckCircle2,
          title: "DRIVER CONNECTED!",
          sub: "On the way to your pickup · ETA 6 min",
          driverCardStyle: styles.driverCardAccepted,
          avatarBg: "#16A34A",
          callBtnBg: "#16A34A",
          tripCardStyle: styles.tripAccepted,
          fareRowStyle: styles.fareAccepted,
          fareLabelColor: "#16A34A",
          fareValueColor: "#16A34A",
        };
      case "arrived":
        return {
          gradient: ["#F59E0B", "#D97706"] as const,
          Icon: BellRing,
          title: "DRIVER HAS ARRIVED!",
          sub: "Waiting at pickup · Please come outside",
          driverCardStyle: styles.driverCardArrived,
          avatarBg: "#D97706",
          callBtnBg: "#D97706",
          tripCardStyle: styles.tripArrived,
          fareRowStyle: styles.fareArrived,
          fareLabelColor: "#D97706",
          fareValueColor: "#D97706",
        };
      case "started":
      case "in_transit":
        return {
          gradient: ["#3B82F6", "#1D4ED8"] as const,
          Icon: Navigation,
          title: "TRIP IN PROGRESS",
          sub: `On the way to ${activeBookingData.dropAddress || "destination"}`,
          showProgress: true,
          driverCardStyle: styles.driverCardTransit,
          avatarBg: "#2563EB",
          callBtnBg: "#2563EB",
          tripCardStyle: styles.tripTransit,
          fareRowStyle: styles.fareTransit,
          fareLabelColor: "#2563EB",
          fareValueColor: "#2563EB",
        };
      case "completed":
        return {
          gradient: ["#10B981", "#059669"] as const,
          Icon: CheckCircle2,
          title: "TRIP COMPLETED",
          sub: "Thanks for riding with us!",
          driverCardStyle: styles.driverCardCompleted,
          avatarBg: "#059669",
          tripCardStyle: styles.tripCompleted,
          fareRowStyle: styles.fareCompleted,
          fareLabelColor: "#059669",
          fareValueColor: "#059669",
        };
      case "cancelled":
        return {
          gradient: ["#EF4444", "#B91C1C"] as const,
          Icon: XCircle,
          title: "RIDE CANCELLED",
          sub: "Your booking has been cancelled",
          tripCardStyle: styles.tripCancelled,
          fareRowStyle: styles.farePending,
          fareLabelColor: "#EF4444",
          fareValueColor: "#B91C1C",
        };
      case "pending":
      default:
        return {
          gradient: ["#2563EB", "#1D4ED8"] as const,
          Icon: Search,
          title: "SEARCHING FOR DRIVER",
          sub: "Checking every 10 seconds...",
          showProgress: true,
          tripCardStyle: styles.tripNeutral,
          fareRowStyle: styles.farePending,
          fareLabelColor: "#3B82F6",
          fareValueColor: "#1D4ED8",
        };
    }
  };

  const theme = getThemeConfig();
  const StatusIcon = theme.Icon;
  const isDriverAssigned = Boolean(vehicle) || status !== "pending" && status !== "cancelled";

  return (
    <Modal
      transparent
      visible={Boolean(activeBookingId)}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Full-Width Colored Status Strip */}
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusStrip}
          >
            <View style={styles.stripRow}>
              <View style={styles.stripIconCircle}>
                <StatusIcon size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stripTitle}>{theme.title}</Text>
                <Text style={styles.stripSub}>{theme.sub}</Text>
              </View>
            </View>

            {/* Progress Track for Pending and In Transit */}
            {theme.showProgress && (
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            )}
          </LinearGradient>

          <View style={[styles.cardBody, { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "ios" ? 34 : 24) }]}>
            {/* 1. Pending Radar View */}
            {status === "pending" && (
              <View style={styles.radarBlock}>
                <View style={styles.radarWrapper}>
                  <Animated.View
                    style={[
                      styles.radarPulse,
                      { transform: [{ scale: pulseAnim }] },
                    ]}
                  />
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Car size={34} color="#2563EB" />
                  </Animated.View>
                </View>
                <Text style={styles.searchingTitle}>Connecting to Nearby Driver...</Text>
                <Text style={styles.searchingSubtext}>
                  Please wait while drivers near your location respond
                </Text>
              </View>
            )}

            {/* 2. Cancelled Center View */}
            {status === "cancelled" && (
              <View style={styles.cancelledBlock}>
                <View style={styles.cancelledIconCircle}>
                  <XOctagon size={32} color="#DC2626" />
                </View>
                <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
                <Text style={styles.cancelledSubtext}>
                  This ride request was cancelled. You can book another ride anytime.
                </Text>
              </View>
            )}

            {/* 3. Driver Info Card (Accepted, Arrived, In Transit, Completed) */}
            {isDriverAssigned && status !== "cancelled" && (
              <View style={[styles.driverCardBase, theme.driverCardStyle]}>
                <View style={[styles.avatarCircle, { backgroundColor: theme.avatarBg }]}>
                  <Text style={styles.avatarText}>
                    {getDriverName().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{getDriverName()}</Text>
                  <Text style={styles.vehicleDetails}>
                    {vehicle?.model || "Taxi"} • {vehicle?.color || "White"}
                  </Text>
                  {vehicle?.vehicleRegNum ? (
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateText}>{vehicle.vehicleRegNum}</Text>
                    </View>
                  ) : null}

                  {/* Driver Rating Stars on Completed */}
                  {status === "completed" && (
                    <View style={styles.ratingRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => handleSelectRating(star)}
                          activeOpacity={0.7}
                          style={{ padding: 4 }}
                        >
                          <Star
                            size={18}
                            color="#F59E0B"
                            fill={star <= userRating ? "#F59E0B" : "transparent"}
                          />
                        </TouchableOpacity>
                      ))}
                      {ratingSubmitted && (
                        <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "700", marginLeft: 6 }}>
                          Rated! ⭐
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Call Button (Not shown on completed) */}
                {status !== "completed" && theme.callBtnBg && (
                  <TouchableOpacity
                    style={[styles.callButton, { backgroundColor: theme.callBtnBg }]}
                    onPress={handleCallDriver}
                    activeOpacity={0.8}
                  >
                    <Phone size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Live Waiting Mode Alert Banner */}
            {Boolean(activeBookingData.isWaiting) && status !== "completed" && status !== "cancelled" && (
              <View style={styles.waitingBanner}>
                <View style={styles.waitingBannerLeft}>
                  <Clock size={18} color="#D97706" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.waitingBannerTitle}>Driver Waiting Mode Active</Text>
                    <Text style={styles.waitingBannerSub}>
                      {activeBookingData.waitingMinutes ? `${activeBookingData.waitingMinutes} mins recorded` : "Waiting time accumulating"}
                      {Boolean(activeBookingData.waitingFare) && ` • +Rs. ${activeBookingData.waitingFare}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.waitingPulseDot} />
              </View>
            )}

            {/* Trip Details Card */}
            <View style={[styles.tripCard, theme.tripCardStyle]}>
              <View style={styles.locationRow}>
                <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>PICKUP LOCATION</Text>
                  <Text style={styles.locValue} numberOfLines={2}>
                    {activeBookingData.pickupAddress || "Pickup Point"}
                  </Text>
                </View>
              </View>

              <View style={styles.connector} />

              <View style={styles.locationRow}>
                <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locLabel}>DROP-OFF LOCATION</Text>
                  <Text style={styles.locValue} numberOfLines={2}>
                    {activeBookingData.dropAddress || "Destination"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Fare Summary (Except Cancelled) */}
            {status !== "cancelled" && (
              <View style={[styles.fareRow, theme.fareRowStyle]}>
                <View>
                  <Text style={[styles.fareLabel, { color: theme.fareLabelColor }]}>
                    {status === "completed" ? "FINAL FARE" : status === "started" || status === "in_transit" ? "TRIP FARE" : "ESTIMATED FARE"}
                  </Text>
                  <Text style={[styles.fareValue, { color: theme.fareValueColor }]}>
                    Rs. {activeBookingData.fare ?? 0}
                  </Text>
                  {Boolean(activeBookingData.waitingFare) && (
                    <Text style={{ fontSize: 11, color: "#D97706", fontWeight: "600", marginTop: 2 }}>
                      Includes Rs. {activeBookingData.waitingFare} waiting
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.fareLabel, { color: theme.fareLabelColor }]}>DISTANCE</Text>
                  <Text style={styles.distValue}>{activeBookingData.distance ?? 0} km</Text>
                </View>
              </View>
            )}

            {/* Action Buttons based on status */}
            {status === "completed" ? (
              <View style={styles.completedActionsRow}>
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={handleShowReceipt}
                  activeOpacity={0.8}
                >
                  <Receipt size={18} color="#475569" />
                  <Text style={styles.receiptBtnText}>RECEIPT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={handleDoneWithRating}
                  disabled={isSubmittingRating}
                  activeOpacity={0.8}
                >
                  {isSubmittingRating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Check size={18} color="#FFF" />
                      <Text style={styles.doneBtnText}>DONE</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : status === "cancelled" ? (
              <TouchableOpacity
                style={styles.bookAnotherBtn}
                onPress={() => clearActiveBooking()}
                activeOpacity={0.8}
              >
                <RotateCw size={18} color="#FFF" />
                <Text style={styles.bookAnotherBtnText}>BOOK ANOTHER RIDE</Text>
              </TouchableOpacity>
            ) : status === "started" || status === "in_transit" ? (
              <View style={styles.disabledCancelBtn}>
                <Lock size={16} color="#94A3B8" />
                <Text style={styles.disabledCancelText}>TRIP IN PROGRESS</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelRide}
                activeOpacity={0.8}
              >
                <X size={18} color="#DC2626" />
                <Text style={styles.cancelBtnText}>CANCEL RIDE REQUEST</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <RideReceiptModal
        visible={showReceiptModal}
        bookingId={activeBookingId || activeBookingData?.id || null}
        onClose={() => setShowReceiptModal(false)}
        fallbackData={{
          pickupAddress: activeBookingData?.pickupAddress,
          dropAddress: activeBookingData?.dropAddress,
          distanceKm: activeBookingData?.distance,
          totalFare: activeBookingData?.fare,
          paymentStatus: "paid",
          paymentMethod: "cash",
          driver: {
            name: getDriverName(),
            phoneNumber: vehicle?.driverPhone || "",
            vehicleRegNum: vehicle?.vehicleRegNum,
            vehicleType: vehicle?.model || "Taxi",
          },
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    elevation: 25,
  },
  statusStrip: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stripIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  stripTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  stripSub: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.88)",
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  cardBody: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: "#FFFFFF",
  },

  // Radar Searching Block
  radarBlock: {
    alignItems: "center",
    marginBottom: 16,
  },
  radarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  radarPulse: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#93C5FD",
  },
  searchingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  searchingSubtext: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 16,
  },

  // Cancelled Block
  cancelledBlock: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 12,
  },
  cancelledIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  cancelledSubtext: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },

  // Driver Card Tints
  driverCardBase: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  driverCardAccepted: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },
  driverCardArrived: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
  },
  driverCardTransit: {
    backgroundColor: "#EFF6FF",
    borderColor: "#93C5FD",
  },
  driverCardCompleted: {
    backgroundColor: "#ECFDF5",
    borderColor: "#6EE7B7",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  vehicleDetails: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
  },
  plateBadge: {
    backgroundColor: "#FEF08A",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginTop: 3,
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  plateText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#854D0E",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  // Trip Card Tints
  tripCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  tripNeutral: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  tripAccepted: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  tripArrived: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  tripTransit: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  tripCompleted: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  tripCancelled: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },

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
    height: 16,
    backgroundColor: "#CBD5E1",
    marginLeft: 4,
    marginVertical: 3,
  },
  locLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  locValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 1,
  },

  // Fare Row Tints
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  farePending: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  fareAccepted: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
  fareArrived: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" },
  fareTransit: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  fareCompleted: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },

  fareLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  distValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },

  // Buttons
  cancelBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    gap: 8,
  },
  cancelBtnText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  disabledCancelBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  disabledCancelText: {
    color: "#94A3B8",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  completedActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  receiptBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 6,
  },
  receiptBtnText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 13,
  },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#10B981",
    gap: 6,
  },
  doneBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
  },
  bookAnotherBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EF4444",
    gap: 8,
  },
  bookAnotherBtnText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  waitingBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  waitingBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  waitingBannerSub: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "500",
    marginTop: 2,
  },
  waitingPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F59E0B",
  },
});
