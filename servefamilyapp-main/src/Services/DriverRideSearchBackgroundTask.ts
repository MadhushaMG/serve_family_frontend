import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../api/apiClient";
import { useIncomingBookingStore, IncomingBookingData } from "../store/useIncomingBookingStore";
import { emitDriverLocation } from "./TaxiSocketService";

export const DRIVER_RIDE_SEARCH_TASK = "driver-ride-search-background-task";
const LAST_POLL_KEY = "@driver_last_poll_time";

// Register background task for Driver Ride Search
TaskManager.defineTask(DRIVER_RIDE_SEARCH_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("🔴 Driver ride search background task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations && locations.length > 0 ? locations[locations.length - 1] : null;

    if (!location) return;

    try {
      // Ensure user is driver and online
      const userRole = (await AsyncStorage.getItem("userRole")) || (await AsyncStorage.getItem("auth:userRole"));
      const isOnline = await AsyncStorage.getItem("@driver_is_online");

      if (isOnline !== "true") {
        return;
      }
      if (!userRole || (userRole.toLowerCase() !== "driver" && userRole.toLowerCase() !== "admin")) {
        return;
      }

      // Throttle polling to at least 5 seconds between API pings
      const now = Date.now();
      const lastPollRaw = await AsyncStorage.getItem(LAST_POLL_KEY);
      const lastPoll = lastPollRaw ? parseInt(lastPollRaw, 10) : 0;

      if (now - lastPoll < 5000) {
        return;
      }

      await AsyncStorage.setItem(LAST_POLL_KEY, now.toString());

      const { latitude, longitude } = location.coords;
      emitDriverLocation(latitude, longitude);
      console.log(`📡 [Background Task] Polling pending rides for Driver at (${latitude}, ${longitude})`);

      // Check driver assigned bookings and nearby available rides
      let ride: any = null;
      const resDriver = await apiClient.get(`/taxi/driver/bookings?status=pending`).catch(() => null);
      const pendingList = resDriver?.data || (Array.isArray(resDriver) ? resDriver : []);
      if (Array.isArray(pendingList) && pendingList.length > 0) {
        ride = pendingList[0];
      } else {
        const resNearby = await apiClient.get(`/taxi/booking/nearby-requests`, {
          params: { lat: latitude, lng: longitude, radius: 15 },
        }).catch(() => null);
        const nearbyData = resNearby?.data || resNearby;
        if (Array.isArray(nearbyData) && nearbyData.length > 0) {
          ride = nearbyData[0];
        } else if (nearbyData && (nearbyData.id || nearbyData.bookingId)) {
          ride = nearbyData;
        }
      }
      if (ride && (ride.id || ride.bookingId) && ride.status === "pending") {
        const bookingIdStr = String(ride.id || ride.bookingId);

        // 1. Skip if current user is the passenger who made this booking
        let currentUserId: string | null = null;
        try {
          const authRaw = await AsyncStorage.getItem("auth-storage");
          if (authRaw) {
            const parsed = JSON.parse(authRaw);
            currentUserId = parsed?.state?.user?.id || null;
          }
        } catch (_) {}

        if (currentUserId && (ride.userId === currentUserId || ride.passengerId === currentUserId || ride.passenger?.id === currentUserId)) {
          return;
        }

        // 2. Skip if driver already rejected or dismissed this booking
        try {
          const dismissedRaw = await AsyncStorage.getItem("@dismissed_booking_ids");
          const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
          if (dismissedIds.includes(bookingIdStr)) {
            return;
          }
        } catch (_) {}

        const incomingData: IncomingBookingData = {
          bookingId: bookingIdStr,
          customerName: ride.customerName || ride.user?.name || ride.passenger?.name || "Customer Ride Request",
          customerPhone: ride.customerPhone || ride.user?.phone || ride.passenger?.phoneNumber || "",
          pickupLocation: ride.pickupAddress || "Pickup Location",
          dropoffLocation: ride.dropAddress || "Destination",
          pickupLat: ride.pickupLat,
          pickupLng: ride.pickupLng,
          dropoffLat: ride.dropLat,
          dropoffLng: ride.dropLng,
          fare: ride.fare || "0.00",
          distance: ride.distance ? `${ride.distance} km` : "0 km",
          paymentMethod: ride.paymentMethod || "Cash",
          vehicleType: ride.vehicleType || "Taxi",
        };

        console.log("🚨 [Background Task] Found new pending ride request!", incomingData.bookingId);
        useIncomingBookingStore.getState().triggerIncomingBooking(incomingData);
      }
    } catch (err) {
      console.warn("⚠️ Background driver ride search error:", err);
    }
  }
});

/**
 * Start background location tracking & ride search for Driver
 */
export async function startDriverRideSearchBackgroundTask() {
  try {
    const userRole = (await AsyncStorage.getItem("userRole")) || (await AsyncStorage.getItem("auth:userRole"));
    if (!userRole || (userRole.toLowerCase() !== "driver" && userRole.toLowerCase() !== "admin")) {
      console.log("ℹ️ Skipping driver background task start: User is not driver");
      return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_RIDE_SEARCH_TASK);
    if (!hasStarted) {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        await Location.startLocationUpdatesAsync(DRIVER_RIDE_SEARCH_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "🚗 Serve Family Driver Online",
            notificationBody: "Searching for nearby ride requests...",
            notificationColor: "#16A34A",
          },
        });
        await AsyncStorage.setItem("@driver_is_online", "true");
        console.log("✅ Driver ride search background task started");
      }
    }
  } catch (err) {
    console.warn("Failed to start driver ride search background task:", err);
  }
}

/**
 * Stop background location tracking & ride search for Driver
 */
export async function stopDriverRideSearchBackgroundTask() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(DRIVER_RIDE_SEARCH_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(DRIVER_RIDE_SEARCH_TASK);
    }
    await AsyncStorage.setItem("@driver_is_online", "false");
    console.log("🛑 Driver ride search background task stopped");
  } catch (err) {
    console.warn("Failed to stop driver ride search background task:", err);
  }
}
