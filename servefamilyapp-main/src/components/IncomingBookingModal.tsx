import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Phone, MapPin, Navigation, DollarSign, Clock, X, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIncomingBookingStore } from "@/src/store/useIncomingBookingStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export const IncomingBookingModal: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    isModalVisible,
    bookingData,
    countdown,
    isAccepting,
    acceptBooking,
    rejectBooking,
    clearBooking,
    setCountdown,
  } = useIncomingBookingStore();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown timer logic
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isModalVisible) {
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
      }).start();

      // Pulsing effect for header
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      timer = setInterval(() => {
        useIncomingBookingStore.setState((state) => {
          if (state.countdown <= 1) {
            clearInterval(timer);
            state.rejectBooking(); // Auto-reject when time runs out
            return { countdown: 0 };
          }
          return { countdown: state.countdown - 1 };
        });
      }, 1000);
    } else {
      // Reset slide position
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isModalVisible]);

  if (!isModalVisible || !bookingData) return null;

  const progressPercent = (countdown / 30) * 100;

  return (
    <Modal
      transparent
      visible={isModalVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={rejectBooking}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom + 16, Platform.OS === "ios" ? 36 : 24),
            },
          ]}
        >
          {/* Header Badge */}
          <Animated.View style={[styles.headerBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Clock size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.headerText}>NEW RIDE REQUEST ({countdown}s)</Text>
          </Animated.View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
          </View>

          {/* Customer Info */}
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {bookingData.customerName ? bookingData.customerName.charAt(0).toUpperCase() : "C"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{bookingData.customerName || "Customer"}</Text>
              {bookingData.vehicleType && (
                <Text style={styles.vehicleType}>{bookingData.vehicleType}</Text>
              )}
            </View>
            <View style={styles.fareBadge}>
              <Text style={styles.fareCurrency}>Rs.</Text>
              <Text style={styles.fareText}>{bookingData.fare}</Text>
            </View>
          </View>

          {/* Route Details */}
          <View style={styles.routeContainer}>
            {/* Pickup */}
            <View style={styles.locationRow}>
              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>PICKUP</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {bookingData.pickupLocation}
                </Text>
              </View>
            </View>

            {/* Line connector */}
            <View style={styles.lineConnector} />

            {/* Dropoff */}
            <View style={styles.locationRow}>
              <View style={[styles.dot, { backgroundColor: "#EF4444" }]} />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>DROP-OFF</Text>
                <Text style={styles.locationText} numberOfLines={2}>
                  {bookingData.dropoffLocation}
                </Text>
              </View>
            </View>
          </View>

          {/* Distance Info */}
          {bookingData.distance && (
            <View style={styles.distanceRow}>
              <Navigation size={16} color="#6B7280" />
              <Text style={styles.distanceText}>Est. Distance: {bookingData.distance}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {/* Reject Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionButton, styles.rejectButton]}
              onPress={rejectBooking}
            >
              <X size={24} color="#FFF" />
              <Text style={styles.buttonText}>DECLINE</Text>
            </TouchableOpacity>

            {/* Accept Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isAccepting}
              style={[styles.actionButton, styles.acceptButton, isAccepting && { opacity: 0.8 }]}
              onPress={acceptBooking}
            >
              {isAccepting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Check size={26} color="#FFF" />
                  <Text style={styles.buttonText}>ACCEPT RIDE</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  headerBadge: {
    backgroundColor: "#2563EB",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  headerText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563EB",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  vehicleType: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  fareBadge: {
    backgroundColor: "#DEF7EC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "flex-end",
  },
  fareCurrency: {
    fontSize: 11,
    color: "#03543F",
    fontWeight: "600",
  },
  fareText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E9F6E",
  },
  routeContainer: {
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 2,
  },
  lineConnector: {
    width: 2,
    height: 20,
    backgroundColor: "#D1D5DB",
    marginLeft: 5,
    marginVertical: 4,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    alignSelf: "center",
  },
  distanceText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
  },
  rejectButton: {
    backgroundColor: "#DC2626",
  },
  acceptButton: {
    backgroundColor: "#16A34A",
    flex: 1.4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
