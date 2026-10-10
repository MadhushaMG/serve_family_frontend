import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Vibration,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../../api/apiClient";
import { playIncomingRingtone, stopIncomingRingtone } from "../../Services/audioService";
import {
  startDriverRideSearchBackgroundTask,
  stopDriverRideSearchBackgroundTask,
} from "../../Services/DriverRideSearchBackgroundTask";
import { useIncomingBookingStore, IncomingBookingData } from "../../store/useIncomingBookingStore";
import { RideReceiptModal } from "./RideReceiptModal";

interface DriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegisterModal?: () => void;
}

export interface DriverEarningsSummary {
  rides: number;
  grossFare: number;
  companyCommission: number;
  netEarnings: number;
}

export interface RecentBillingTrip {
  id: string;
  pickupAddress: string;
  dropAddress: string;
  distance: number;
  fare: number;
  companyCommission: number;
  netEarnings: number;
  passengerName: string;
  passengerPhone?: string;
  createdAt: string;
}

export interface DriverEarningsData {
  driver: {
    id: string;
    vehicleId: string;
    vehicleRegNum: string;
    approvalStatus: string;
    isActive: boolean;
  };
  today: DriverEarningsSummary;
  thisWeek: DriverEarningsSummary;
  thisMonth: DriverEarningsSummary;
  total: DriverEarningsSummary;
  commissionRate: string;
  driverShare: string;
  recentRides: RecentBillingTrip[];
}

interface DriverBookingItem {
  id: string;
  userId: string;
  vehicleId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupAddress: string;
  dropoffAddress: string;
  fare: number;
  distance: number;
  status: string;
  createdAt: string;
  passenger?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phoneNumber?: string;
  };
  vehicle?: {
    id: string;
    vehicleRegNum: string;
    vehicleType?: {
      id: string;
      type: string;
      category: string;
    };
  };
}

interface AvailableRideRequest {
  id: string;
  bookingId?: string;
  vehicleId?: string;
  passengerName?: string;
  passengerMobile?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  estimatedFare: number;
  status: string;
  createdAt?: string;
}

interface ActiveBooking {
  id: string;
  vehicleId?: string;
  passengerName?: string;
  passengerMobile?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;
  distance: number;
  estimatedFare: number;
  status: "pending" | "accepted" | "arrived" | "in_transit" | "completed" | "cancelled";
}

const DriverModal: React.FC<DriverModalProps> = ({
  isOpen,
  onClose,
  onOpenRegisterModal,
}) => {
  const insets = useSafeAreaInsets();

  // ── 1. Driver Status & Rates (Phase 1.4) ──
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [ratePerKm, setRatePerKm] = useState<string>("110");
  const [pickupFare, setPickupFare] = useState<string>("50");
  const [isUpdatingRate, setIsUpdatingRate] = useState<boolean>(false);
  const [myVehicleId, setMyVehicleId] = useState<string>("");

  // ── 2. Available Rides (Phase 3.1) ──
  const [availableRides, setAvailableRides] = useState<AvailableRideRequest[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState<boolean>(false);

  // ── 3. Active Booking (Phase 3.2 & Phase 4) ──
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // ── 4. Incoming Booking Ringing Alert State ──
  const [incomingBooking, setIncomingBooking] = useState<DriverBookingItem | null>(null);
  const [isRinging, setIsRinging] = useState<boolean>(false);

  // ── 5. Driver Earnings & Billing State ──
  const [earningsData, setEarningsData] = useState<DriverEarningsData | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState<boolean>(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"today" | "thisWeek" | "thisMonth" | "total">("today");
  const [selectedReceiptBookingId, setSelectedReceiptBookingId] = useState<string | null>(null);
  const [isReceiptModalVisible, setIsReceiptModalVisible] = useState<boolean>(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initial & Persistent Online State Restore ──
  useEffect(() => {
    const restoreOnlineState = async () => {
      try {
        const stored = await AsyncStorage.getItem("@driver_is_online");
        if (stored === "true") {
          setIsOnline(true);
        } else if (stored === "false") {
          setIsOnline(false);
        }
      } catch (e) {
        console.warn("Error reading stored driver online state:", e);
      }
    };
    restoreOnlineState();
  }, []);

  // ── Initial Fetch: Vehicle Info & Rate Settings + Earnings & Billing ──
  useEffect(() => {
    if (isOpen) {
      fetchDriverProfileAndVehicle();
      fetchDriverEarnings();
    }
  }, [isOpen]);

  const fetchDriverEarnings = async () => {
    setIsLoadingEarnings(true);
    try {
      const res = await apiClient.get("/taxi/driver/earnings");
      if (res && res.success && res.data) {
        setEarningsData(res.data);
      }
    } catch (err) {
      console.warn("Driver earnings fetch error:", err);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const fetchDriverProfileAndVehicle = async () => {
    try {
      const res = await apiClient.get("/taxi/my-vehicle");
      if (res && res.success && res.data) {
        setMyVehicleId(res.data.id || res.data.vehicleId || "");
        if (res.data.isActive !== undefined && res.data.isActive !== null) {
          const onlineState = Boolean(res.data.isActive);
          setIsOnline(onlineState);
          await AsyncStorage.setItem("@driver_is_online", onlineState ? "true" : "false");
          if (onlineState) {
            startDriverRideSearchBackgroundTask();
          } else {
            stopDriverRideSearchBackgroundTask();
          }
        }
        if (res.data.ratePerKm) setRatePerKm(String(res.data.ratePerKm));
        if (res.data.pickupFare) setPickupFare(String(res.data.pickupFare));
      }
    } catch (err) {
      console.warn("My vehicle fetch error:", err);
    }
  };

  // ── Phase 1.4: Update Rate, Settings & Online Toggle (PATCH /api/taxi/update-settings or /api/taxi/update-rate) ──
  const handleUpdateRate = async (newOnlineStatus?: boolean) => {
    const targetOnline = newOnlineStatus !== undefined ? newOnlineStatus : isOnline;
    setIsUpdatingRate(true);
    try {
      // Optimistically update local state & AsyncStorage so UI and persistence are immediate
      setIsOnline(targetOnline);
      await AsyncStorage.setItem("@driver_is_online", targetOnline ? "true" : "false");

      const payload = {
        isActive: targetOnline,
        ratePerKm: Number(ratePerKm) || 0,
        pickupFare: Number(pickupFare) || 0,
        showMobileNum: true,
      };

      let res;
      try {
        res = await apiClient.patch("/taxi/update-settings", payload);
      } catch (patchErr: any) {
        if (patchErr?.response?.status === 404 || patchErr?.status === 404) {
          res = await apiClient.patch("/taxi/update-rate", payload);
        } else {
          throw patchErr;
        }
      }

      if (res && (res.success || res.status === 200)) {
        if (targetOnline) {
          await startDriverRideSearchBackgroundTask();
        } else {
          await stopDriverRideSearchBackgroundTask();
          stopIncomingRingtone();
          Vibration.cancel();
          setIsRinging(false);
          setIncomingBooking(null);
        }
      } else {
        // Rollback on failure
        setIsOnline(!targetOnline);
        await AsyncStorage.setItem("@driver_is_online", (!targetOnline) ? "true" : "false");
        Alert.alert("Update Failed", res?.message || "Failed to update driver status.");
      }
    } catch (err: any) {
      console.error("Update rate error:", err);
      // Rollback on error
      setIsOnline(!targetOnline);
      await AsyncStorage.setItem("@driver_is_online", (!targetOnline) ? "true" : "false");
      const errMsg = err?.response?.data?.message || err?.message || "";
      if (
        errMsg.toLowerCase().includes("not found") ||
        err?.response?.status === 404 ||
        err?.status === 404
      ) {
        Alert.alert(
          "Vehicle Registration Required 🚖",
          "Your vehicle has either not been registered yet or is pending Admin approval. Please register your vehicle first.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Register Vehicle",
              onPress: () => {
                onClose();
                if (onOpenRegisterModal) onOpenRegisterModal();
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", errMsg || "Failed to update driver rate.");
      }
    } finally {
      setIsUpdatingRate(false);
    }
  };

  // ── 5s Interval Polling: Continues as long as Driver is ONLINE (even when navigating between tabs) ──
  useEffect(() => {
    if (isOnline && !activeBooking) {
      fetchAvailableRides();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchAvailableRides();
      }, 5000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      stopIncomingRingtone();
      Vibration.cancel();
      setIsRinging(false);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOnline, activeBooking]);

  const fetchAvailableRides = async () => {
    setIsLoadingRides(true);
    try {
      // Query Driver Assigned Bookings (GET /api/taxi/driver/bookings?status=pending)
      const resDriver = await apiClient.get("/taxi/driver/bookings?status=pending");
      const pendingList: DriverBookingItem[] =
        resDriver && resDriver.success && Array.isArray(resDriver.data) ? resDriver.data : [];

      if (pendingList.length > 0) {
        const item = pendingList[0];
        
        // Skip if booking was dismissed by driver
        const dismissedRaw = await AsyncStorage.getItem("@dismissed_booking_ids");
        const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
        if (dismissedIds.includes(String(item.id))) {
          return;
        }

        // Trigger global incoming booking modal so driver receives ride regardless of active tab
        const incomingData: IncomingBookingData = {
          bookingId: String(item.id),
          customerName: item.passenger?.name || "Customer Ride Request",
          customerPhone: item.passenger?.phoneNumber || "",
          pickupLocation: item.pickupAddress || "Pickup Location",
          dropoffLocation: item.dropoffAddress || "Destination",
          pickupLat: item.pickupLat,
          pickupLng: item.pickupLng,
          dropoffLat: item.dropoffLat,
          dropoffLng: item.dropoffLng,
          fare: item.fare || 0,
          distance: item.distance ? `${item.distance} km` : "0 km",
          paymentMethod: "Cash",
          vehicleType: item.vehicle?.vehicleType?.type || "Taxi",
        };
        useIncomingBookingStore.getState().triggerIncomingBooking(incomingData);

        // If a different booking surfaced while we were ringing an older one, reset ring cycle.
        if (incomingBooking && incomingBooking.id !== item.id) {
          stopIncomingRingtone();
          Vibration.cancel();
          setIsRinging(false);
        }
        setIncomingBooking(item);
        if (!isRinging) {
          setIsRinging(true);
          playIncomingRingtone();
          Vibration.vibrate([0, 500, 300, 500], false);
        }
        return;
      }

      // No pending booking for this driver anymore — another driver may have accepted,
      // or it was cancelled/expired. Make sure we stop any active ring + clear state.
      if (incomingBooking || isRinging) {
        stopIncomingRingtone();
        Vibration.cancel();
        setIsRinging(false);
        setIncomingBooking(null);
      }

      // Fallback: Query GET /api/taxi/available-rides
      const res = await apiClient.get("/taxi/available-rides");
      if (res && res.success && Array.isArray(res.data)) {
        setAvailableRides(res.data);
      } else {
        setAvailableRides([]);
      }
    } catch (err) {
      console.warn("Available rides fetch error:", err);
    } finally {
      setIsLoadingRides(false);
    }
  };

  // ── Accept Incoming Booking (PickMe Ringing Screen) ──
  const handleAcceptIncomingBooking = async () => {
    if (!incomingBooking) return;
    setIsUpdatingStatus(true);
    try {
      stopIncomingRingtone();
      Vibration.cancel();
      setIsRinging(false);

      const payload = {
        vehicleId: myVehicleId || incomingBooking.vehicleId || "",
      };

      const res = await apiClient.patch(`/taxi/booking/${incomingBooking.id}/accept`, payload);

      if (res && (res.success || res.status === 200)) {
        const acceptedData: ActiveBooking = {
          id: incomingBooking.id,
          vehicleId: myVehicleId,
          passengerName: incomingBooking.passenger?.name || "Passenger",
          passengerMobile: incomingBooking.passenger?.phoneNumber || "",
          pickupAddress: incomingBooking.pickupAddress,
          pickupLat: incomingBooking.pickupLat,
          pickupLng: incomingBooking.pickupLng,
          dropoffAddress: incomingBooking.dropoffAddress,
          dropoffLat: incomingBooking.dropoffLat,
          dropoffLng: incomingBooking.dropoffLng,
          distance: incomingBooking.distance,
          estimatedFare: incomingBooking.fare,
          status: "accepted",
        };
        setActiveBooking(acceptedData);
        setIncomingBooking(null);
        setAvailableRides([]);
      } else {
        Alert.alert("Accept Failed", res?.message || "Could not accept ride.");
      }
    } catch (err: any) {
      console.error("Accept incoming booking error:", err);
      Alert.alert("Error", err?.message || "Failed to accept ride.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeclineIncomingBooking = () => {
    stopIncomingRingtone();
    Vibration.cancel();
    setIsRinging(false);
    if (incomingBooking?.id) {
      AsyncStorage.getItem("@dismissed_booking_ids")
        .then((raw) => {
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(String(incomingBooking.id))) {
            list.push(String(incomingBooking.id));
            if (list.length > 50) list.shift();
            AsyncStorage.setItem("@dismissed_booking_ids", JSON.stringify(list));
          }
        })
        .catch(() => {});
    }
    setIncomingBooking(null);
  };

  // ── Phase 3.2: Accept Ride Request (PATCH /api/taxi/booking/:bookingId/accept) ──
  const handleAcceptRide = async (ride: AvailableRideRequest) => {
    const bookingId = ride.bookingId || ride.id;
    setIsUpdatingStatus(true);
    try {
      const payload = {
        vehicleId: myVehicleId || ride.vehicleId || "",
      };

      const res = await apiClient.patch(`/taxi/booking/${bookingId}/accept`, payload);

      if (res && (res.success || res.status === 200)) {
        const acceptedData: ActiveBooking = {
          id: bookingId,
          vehicleId: myVehicleId,
          passengerName: ride.passengerName || "Passenger",
          passengerMobile: ride.passengerMobile || "",
          pickupAddress: ride.pickupAddress,
          pickupLat: ride.pickupLat,
          pickupLng: ride.pickupLng,
          dropoffAddress: ride.dropoffAddress,
          dropoffLat: ride.dropoffLat,
          dropoffLng: ride.dropoffLng,
          distance: ride.distance,
          estimatedFare: ride.estimatedFare,
          status: "accepted",
        };
        setActiveBooking(acceptedData);
        setAvailableRides([]);
      } else {
        Alert.alert("Accept Failed", res?.message || "Could not accept ride.");
      }
    } catch (err: any) {
      console.error("Accept ride error:", err);
      Alert.alert("Error", err?.message || "Failed to accept ride.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Phase 4.1 to 4.4: Update Trip Status (PATCH /api/taxi/booking/:bookingId/status) ──
  const handleUpdateTripStatus = async (
    newStatus: "arrived" | "in_transit" | "completed" | "cancelled"
  ) => {
    if (!activeBooking) return;
    setIsUpdatingStatus(true);
    try {
      const payload = { status: newStatus };
      const res = await apiClient.patch(`/taxi/booking/${activeBooking.id}/status`, payload);

      if (res && (res.success || res.status === 200)) {
        if (newStatus === "completed") {
          const completedId = activeBooking.id;
          setActiveBooking(null);
          setSelectedReceiptBookingId(completedId);
          setIsReceiptModalVisible(true);
          fetchDriverEarnings();
        } else if (newStatus === "cancelled") {
          setActiveBooking(null);
        } else {
          setActiveBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        Alert.alert("Update Failed", res?.message || "Failed to update trip status.");
      }
    } catch (err: any) {
      console.error("Update trip status error:", err);
      Alert.alert("Error", err?.message || "Failed to update trip status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ── Call Passenger Helper ──
  const handleCallPassenger = (phone?: string) => {
    if (!phone) {
      Alert.alert("No Phone Number", "Passenger phone number is not available.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color="#16A34A" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Driver Dashboard</Text>
            <View style={styles.onlineBadgeHeader}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? "#16A34A" : "#EF4444" }]} />
              <Text style={styles.onlineBadgeText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* ── MODULE 1: ONLINE / OFFLINE TOGGLE & RATE SETTINGS (Phase 1.4) ── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="speedometer-outline" size={22} color="#16A34A" />
                <Text style={styles.cardTitle}>Status & Rate Settings</Text>
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>
                    {isOnline ? "🟢 You are ONLINE" : "🔴 You are OFFLINE"}
                  </Text>
                  <Text style={styles.switchSublabel}>
                    {isOnline ? "Receiving passenger ride requests nearby" : "Turn ON to receive ride requests"}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  onValueChange={(val) => handleUpdateRate(val)}
                  trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                  thumbColor={isOnline ? "#16A34A" : "#9CA3AF"}
                  disabled={isUpdatingRate}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Rate / Km (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={ratePerKm}
                    onChangeText={setRatePerKm}
                    keyboardType="numeric"
                    placeholder="110"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Pickup Fare (LKR)</Text>
                  <TextInput
                    style={styles.input}
                    value={pickupFare}
                    onChangeText={setPickupFare}
                    keyboardType="numeric"
                    placeholder="50"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveRateBtn, isUpdatingRate && styles.disabledBtn]}
                onPress={() => handleUpdateRate(isOnline)}
                disabled={isUpdatingRate}
              >
                {isUpdatingRate ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.saveRateBtnText}>Save Rates & Sync</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── MODULE 2: ACTIVE TRIP LIFECYCLE (Phase 4.1 to 4.4) ── */}
            {activeBooking ? (
              <View style={[styles.card, styles.activeTripCard]}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="navigate-circle-outline" size={24} color="#2563EB" />
                  <Text style={[styles.cardTitle, { color: "#1E40AF" }]}>
                    Active Trip - {activeBooking.status.toUpperCase()}
                  </Text>
                </View>

                {/* Passenger Info Bar */}
                <View style={styles.passengerInfoBar}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passengerName}>{activeBooking.passengerName}</Text>
                    {activeBooking.passengerMobile ? (
                      <Text style={styles.passengerPhone}>{activeBooking.passengerMobile}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.callPassengerBtn}
                    onPress={() => handleCallPassenger(activeBooking.passengerMobile)}
                  >
                    <Ionicons name="call" size={18} color="#FFF" />
                    <Text style={styles.callPassengerBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>

                {/* Trip Route Details */}
                <View style={styles.routeDetailsBox}>
                  <View style={styles.routeRow}>
                    <Ionicons name="ellipse" size={12} color="#16A34A" />
                    <Text style={styles.routeText} numberOfLines={2}>
                      <Text style={{ fontWeight: "700" }}>Pickup: </Text>
                      {activeBooking.pickupAddress}
                    </Text>
                  </View>

                  <View style={styles.routeDivider} />

                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={14} color="#2563EB" />
                    <Text style={styles.routeText} numberOfLines={2}>
                      <Text style={{ fontWeight: "700" }}>Dropoff: </Text>
                      {activeBooking.dropoffAddress}
                    </Text>
                  </View>
                </View>

                <View style={styles.tripMetaRow}>
                  <Text style={styles.tripMetaText}>Distance: {activeBooking.distance?.toFixed(1)} km</Text>
                  <Text style={styles.tripFareText}>Est. Fare: LKR {Number(activeBooking.estimatedFare || 0).toFixed(2)}</Text>
                </View>

                {/* Stepper Lifecycle Actions */}
                <View style={styles.stepperContainer}>
                  {/* Step 1: Mark Arrived */}
                  {(activeBooking.status === "accepted" || activeBooking.status === "pending") && (
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: "#2563EB" }]}
                      onPress={() => handleUpdateTripStatus("arrived")}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="pin" size={20} color="#FFF" />
                          <Text style={styles.statusActionBtnText}>I Have Arrived 📍</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 2: Start Trip / In Transit */}
                  {activeBooking.status === "arrived" && (
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: "#16A34A" }]}
                      onPress={() => handleUpdateTripStatus("in_transit")}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="car-sport" size={20} color="#FFF" />
                          <Text style={styles.statusActionBtnText}>Start Trip 🚕</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Step 3: Complete Trip */}
                  {activeBooking.status === "in_transit" && (
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { backgroundColor: "#15803D" }]}
                      onPress={() => handleUpdateTripStatus("completed")}
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done-circle" size={22} color="#FFF" />
                          <Text style={styles.statusActionBtnText}>Complete Trip & Collect Fare 🎉</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={styles.cancelTripBtn}
                    onPress={() =>
                      Alert.alert(
                        "Cancel Ride",
                        "Are you sure you want to cancel this trip?",
                        [
                          { text: "No", style: "cancel" },
                          {
                            text: "Yes, Cancel",
                            style: "destructive",
                            onPress: () => handleUpdateTripStatus("cancelled"),
                          },
                        ]
                      )
                    }
                    disabled={isUpdatingStatus}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                    <Text style={styles.cancelTripBtnText}>Cancel Ride</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── MODULE 3: AVAILABLE RIDE REQUESTS (Phase 3.1 & 3.2) ── */
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="notifications-outline" size={22} color="#16A34A" />
                  <Text style={styles.cardTitle}>Available Ride Requests</Text>
                  {isLoadingRides && <ActivityIndicator size="small" color="#16A34A" style={{ marginLeft: 8 }} />}
                </View>

                {!isOnline ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="power-outline" size={36} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>You are currently Offline</Text>
                    <Text style={styles.emptySub}>Turn ON your Online status above to receive ride requests.</Text>
                  </View>
                ) : availableRides.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="car-outline" size={36} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Available Rides</Text>
                    <Text style={styles.emptySub}>Listening for nearby passenger ride requests...</Text>
                  </View>
                ) : (
                  availableRides.slice(0, 1).map((ride) => (
                    <View key={ride.id || ride.bookingId} style={styles.rideCard}>
                      <View style={styles.rideCardHeader}>
                        <Ionicons name="person-circle-outline" size={20} color="#16A34A" />
                        <Text style={styles.ridePassengerName}>
                          {ride.passengerName || "Passenger Request"}
                        </Text>
                        <Text style={styles.rideFareBadge}>LKR {Number(ride.estimatedFare || 0).toFixed(2)}</Text>
                      </View>

                      <View style={styles.rideRouteRow}>
                        <Ionicons name="ellipse" size={10} color="#16A34A" />
                        <Text style={styles.rideAddressText} numberOfLines={1}>
                          {ride.pickupAddress}
                        </Text>
                      </View>

                      <View style={styles.rideRouteRow}>
                        <Ionicons name="location" size={12} color="#EF4444" />
                        <Text style={styles.rideAddressText} numberOfLines={1}>
                          {ride.dropoffAddress}
                        </Text>
                      </View>

                      <View style={styles.rideMetaRow}>
                        <Text style={styles.rideDistanceText}>Est. Distance: {ride.distance?.toFixed(1)} km</Text>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => handleAcceptRide(ride)}
                          disabled={isUpdatingStatus}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                          <Text style={styles.acceptBtnText}>Accept Ride</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* ── MODULE 4: DRIVER WALLET, EARNINGS & BILLING HISTORY ── */}
            <View style={styles.card}>
              <View style={[styles.cardHeaderRow, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="wallet-outline" size={22} color="#16A34A" />
                  <Text style={styles.cardTitle}>Driver Wallet & Billing</Text>
                </View>
                <TouchableOpacity
                  onPress={fetchDriverEarnings}
                  style={styles.refreshEarningsBtn}
                  disabled={isLoadingEarnings}
                >
                  {isLoadingEarnings ? (
                    <ActivityIndicator size="small" color="#16A34A" />
                  ) : (
                    <Ionicons name="refresh-outline" size={18} color="#16A34A" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Wallet Summary Hero Banner */}
              <View style={styles.walletHeroBanner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletHeroLabel}>TOTAL WALLET BALANCE (90% NET)</Text>
                  <Text style={styles.walletHeroAmount}>
                    LKR {Number(earningsData?.total?.netEarnings || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.walletHeroSub}>
                    Total Rides: {earningsData?.total?.rides || 0} • Platform Fee: 10%
                  </Text>
                </View>
                <View style={styles.walletBadgeIcon}>
                  <Ionicons name="cash-outline" size={26} color="#16A34A" />
                </View>
              </View>

              {/* Timeframe Selector Pills */}
              <View style={styles.timeframeSelectorRow}>
                {(
                  [
                    { key: "today", label: "Today" },
                    { key: "thisWeek", label: "This Week" },
                    { key: "thisMonth", label: "This Month" },
                    { key: "total", label: "All Time" },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.timeframePill,
                      selectedTimeframe === tab.key && styles.timeframePillActive,
                    ]}
                    onPress={() => setSelectedTimeframe(tab.key)}
                  >
                    <Text
                      style={[
                        styles.timeframePillText,
                        selectedTimeframe === tab.key && styles.timeframePillTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Metric Breakdown Grid */}
              {(() => {
                const currentStats =
                  earningsData?.[selectedTimeframe] || {
                    rides: 0,
                    grossFare: 0,
                    companyCommission: 0,
                    netEarnings: 0,
                  };
                return (
                  <View style={styles.metricsGrid}>
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Net Payout (90%)</Text>
                      <Text style={[styles.metricValue, { color: "#16A34A" }]}>
                        LKR {Number(currentStats.netEarnings || 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Gross Fare</Text>
                      <Text style={styles.metricValue}>
                        LKR {Number(currentStats.grossFare || 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Platform Fee (10%)</Text>
                      <Text style={[styles.metricValue, { color: "#D97706" }]}>
                        LKR {Number(currentStats.companyCommission || 0).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>Rides Completed</Text>
                      <Text style={[styles.metricValue, { color: "#2563EB" }]}>
                        {currentStats.rides || 0}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Recent Invoices & Billing History Sub-section */}
              <View style={styles.recentInvoicesHeader}>
                <Ionicons name="receipt-outline" size={18} color="#374151" />
                <Text style={styles.recentInvoicesTitle}>Billing & Trip Invoices</Text>
              </View>

              {isLoadingEarnings ? (
                <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 20 }} />
              ) : !earningsData?.recentRides || earningsData.recentRides.length === 0 ? (
                <View style={styles.emptyBillingBox}>
                  <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyBillingText}>No completed trips found yet</Text>
                  <Text style={styles.emptyBillingSub}>
                    Official itemized invoices and net earnings will appear here once trips are completed.
                  </Text>
                </View>
              ) : (
                earningsData.recentRides.map((ride) => (
                  <View key={ride.id} style={styles.billingItemCard}>
                    <View style={styles.billingItemHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.billingPassengerName}>{ride.passengerName}</Text>
                        <Text style={styles.billingDateText}>
                          {ride.createdAt ? new Date(ride.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.billingNetText}>
                          +LKR {Number(ride.netEarnings || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.billingGrossText}>
                          Gross: LKR {Number(ride.fare || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.billingRouteBox}>
                      <View style={styles.billingRouteRow}>
                        <Ionicons name="ellipse" size={8} color="#16A34A" />
                        <Text style={styles.billingAddressText} numberOfLines={1}>
                          {ride.pickupAddress}
                        </Text>
                      </View>
                      <View style={styles.billingRouteRow}>
                        <Ionicons name="location" size={10} color="#EF4444" />
                        <Text style={styles.billingAddressText} numberOfLines={1}>
                          {ride.dropAddress}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.billingActionsRow}>
                      <Text style={styles.billingCommissionText}>
                        10% Comm: LKR {Number(ride.companyCommission || 0).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.viewInvoiceBtn}
                        onPress={() => {
                          setSelectedReceiptBookingId(ride.id);
                          setIsReceiptModalVisible(true);
                        }}
                      >
                        <Ionicons name="document-text-outline" size={14} color="#16A34A" />
                        <Text style={styles.viewInvoiceBtnText}>Official Invoice 📄</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>

        {/* ── PICKME STYLE INCOMING RIDE RINGING MODAL ── */}
        <Modal
          visible={isRinging && Boolean(incomingBooking)}
          transparent
          animationType="slide"
          onRequestClose={handleDeclineIncomingBooking}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
            <View
              style={{
                backgroundColor: '#111827',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: Math.max(insets.bottom + 16, 24),
                alignItems: 'center',
              }}
            >
              
              {/* Ringing Sound Pulse Icon */}
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="notifications-outline" size={36} color="#FFF" />
              </View>

              <Text style={{ fontSize: 18, fontWeight: '800', color: '#4ADE80', letterSpacing: 1, marginBottom: 4 }}>
                NEW RIDE REQUEST 🚖
              </Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                Incoming ride from passenger. Tap Accept to confirm.
              </Text>

              {/* Passenger Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 16, padding: 12, width: '100%', marginBottom: 16 }}>
                {incomingBooking?.passenger?.avatar ? (
                  <Image source={{ uri: incomingBooking.passenger.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={24} color="#FFF" />
                  </View>
                )}
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>
                    {incomingBooking?.passenger?.name || 'Passenger'}
                  </Text>
                  {incomingBooking?.passenger?.phoneNumber ? (
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                      📞 {incomingBooking.passenger.phoneNumber}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>
                    LKR {Number(incomingBooking?.fare || 0).toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {Number(incomingBooking?.distance || 0).toFixed(2)} km
                  </Text>
                </View>
              </View>

              {/* Pickup & Dropoff Route */}
              <View style={{ backgroundColor: '#1F2937', borderRadius: 16, padding: 14, width: '100%', marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Ionicons name="ellipse" size={12} color="#16A34A" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}>PICKUP</Text>
                    <Text style={{ fontSize: 13, color: '#FFF', marginTop: 2 }} numberOfLines={2}>
                      {incomingBooking?.pickupAddress || 'Current Location'}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: '#374151', marginVertical: 6 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="square" size={12} color="#EF4444" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#9CA3AF' }}>DROPOFF</Text>
                    <Text style={{ fontSize: 13, color: '#FFF', marginTop: 2 }} numberOfLines={2}>
                      {incomingBooking?.dropoffAddress || 'Not specified'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons: Accept / Decline */}
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#DC2626', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleDeclineIncomingBooking}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>Decline ✖</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 2, backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleAcceptIncomingBooking}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFF' }}>ACCEPT RIDE 🚖</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>

        {/* ── OFFICIAL BILLING RECEIPT MODAL ── */}
        <RideReceiptModal
          visible={isReceiptModalVisible}
          bookingId={selectedReceiptBookingId}
          onClose={() => {
            setIsReceiptModalVisible(false);
            setSelectedReceiptBookingId(null);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  onlineBadgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activeTripCard: {
    borderColor: "#2563EB",
    borderWidth: 1.5,
    backgroundColor: "#EFF6FF",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  switchSublabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#111827",
  },
  saveRateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveRateBtnText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  rideCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rideCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ridePassengerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 6,
    flex: 1,
  },
  rideFareBadge: {
    backgroundColor: "#DCFCE7",
    color: "#15803D",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rideRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rideAddressText: {
    fontSize: 12,
    color: "#4B5563",
    marginLeft: 6,
    flex: 1,
  },
  rideMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  rideDistanceText: {
    fontSize: 12,
    color: "#6B7280",
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  passengerInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  passengerPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  callPassengerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  callPassengerBtnText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  routeDetailsBox: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeText: {
    fontSize: 13,
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  tripMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  tripMetaText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  tripFareText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "700",
  },
  stepperContainer: {
    gap: 10,
  },
  statusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  statusActionBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
  cancelTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  cancelTripBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  refreshEarningsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
  },
  walletHeroBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#064E3B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  walletHeroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6EE7B7",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  walletHeroAmount: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    marginBottom: 4,
  },
  walletHeroSub: {
    fontSize: 11,
    color: "#A7F3D0",
  },
  walletBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  timeframeSelectorRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  timeframePillActive: {
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeframePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  timeframePillTextActive: {
    color: "#16A34A",
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  recentInvoicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  recentInvoicesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 6,
  },
  emptyBillingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
  },
  emptyBillingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 6,
  },
  emptyBillingSub: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
  billingItemCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  billingItemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  billingPassengerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  billingDateText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  billingNetText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
  },
  billingGrossText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  billingRouteBox: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  billingRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  billingAddressText: {
    fontSize: 11,
    color: "#4B5563",
    marginLeft: 6,
    flex: 1,
  },
  billingActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billingCommissionText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  viewInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  viewInvoiceBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    marginLeft: 4,
  },
});

export default DriverModal;
