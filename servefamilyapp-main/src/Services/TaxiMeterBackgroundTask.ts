import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TaxiMeterNotificationService } from "./TaxiMeterNotificationService";
import { calculateFare, LocationPoint, calculateElapsedSeconds } from "../store/useTaxiMeterStore";

export const TAXI_METER_BACKGROUND_TASK = "taxi-meter-background-task";

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

// Register background task for Taxi Meter
TaskManager.defineTask(TAXI_METER_BACKGROUND_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error("🔴 Taxi meter background task error:", error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations && locations.length > 0 ? locations[locations.length - 1] : null;

    if (!location) return;

    try {
      const rawStore = await AsyncStorage.getItem("taxi-meter-storage");
      if (!rawStore) return;

      const parsed = JSON.parse(rawStore);
      const state = parsed?.state;

      if (!state || state.status !== "running") {
        return;
      }

      const newPoint: LocationPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        speed: location.coords.speed,
      };

      // Ignore inaccurate GPS noise
      if (location.coords.accuracy && location.coords.accuracy > 25) {
        return;
      }

      const speedKmH =
        location.coords.speed != null && location.coords.speed >= 0
          ? Math.round(location.coords.speed * 3.6)
          : 0;

      let distanceMeters = state.distanceMeters || 0;
      const lastPoint = state.lastLocation;

      if (lastPoint) {
        const dist = getDistanceMeters(
          lastPoint.latitude,
          lastPoint.longitude,
          newPoint.latitude,
          newPoint.longitude
        );

        // Filter out micro-movements under 1.5m and GPS drift while stationary (speed < 1 km/h)
        if (dist >= 1.5 && speedKmH >= 1) {
          distanceMeters += dist;
        }
      }

      const baseFare = state.baseFare || 100;
      const ratePerKm = state.ratePerKm || 100;
      const liveFare = calculateFare(distanceMeters, baseFare, ratePerKm);

      // Compute exact elapsed seconds from timestamps
      const elapsedSeconds = calculateElapsedSeconds(
        state.startTime || null,
        state.totalPausedDuration || 0,
        state.status || "running",
        state.pauseStartTime || null
      );

      // Save updated state back to AsyncStorage
      const updatedState = {
        ...parsed,
        state: {
          ...state,
          distanceMeters,
          elapsedSeconds,
          currentSpeedKmH: speedKmH,
          liveFare,
          lastLocation: newPoint,
        },
      };

      await AsyncStorage.setItem("taxi-meter-storage", JSON.stringify(updatedState));

      // Update continuous status notification with live metrics
      await TaxiMeterNotificationService.updateRunningNotification(
        liveFare,
        distanceMeters,
        elapsedSeconds,
        "running"
      );
    } catch (err) {
      console.error("Error updating taxi meter in background task:", err);
    }
  }
});

/**
 * Start background location tracking for Taxi Meter
 */
export async function startTaxiMeterBackgroundTask() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(TAXI_METER_BACKGROUND_TASK);
    if (!hasStarted) {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        await Location.startLocationUpdatesAsync(TAXI_METER_BACKGROUND_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 2,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "🚕 Taxi Meter Active",
            notificationBody: "Taxi meter is running in background...",
            notificationColor: "#16A34A",
          },
        });
      }
    }
  } catch (err) {
    console.warn("Failed to start taxi meter background location updates:", err);
  }
}

/**
 * Stop background location tracking for Taxi Meter
 */
export async function stopTaxiMeterBackgroundTask() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(TAXI_METER_BACKGROUND_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(TAXI_METER_BACKGROUND_TASK);
    }
  } catch (err) {
    console.warn("Failed to stop taxi meter background location updates:", err);
  }
}
