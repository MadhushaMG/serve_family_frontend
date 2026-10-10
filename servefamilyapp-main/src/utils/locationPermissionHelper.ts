import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

export interface PermissionResult {
  fgGranted: boolean;
  bgGranted: boolean;
  notificationsGranted: boolean;
}

/**
 * Consolidated location permission requester (Place 2).
 * Requests Foreground Location, Background Location, and Notifications
 * all together in a single unified flow.
 */
export async function requestAllLocationPermissions(): Promise<PermissionResult> {
  let fgGranted = false;
  let bgGranted = false;
  let notificationsGranted = false;

  try {
    // 1. Request Foreground Location
    const fg = await Location.requestForegroundPermissionsAsync();
    fgGranted = fg.status === "granted";

    if (fgGranted) {
      // 2. Request Background Location
      try {
        const bg = await Location.requestBackgroundPermissionsAsync();
        bgGranted = bg.status === "granted";
      } catch (bgErr) {
        console.warn("[Permissions] Background location error:", bgErr);
      }
    }

    // 3. Request Notification Permissions
    try {
      const notif = await Notifications.requestPermissionsAsync();
      notificationsGranted = notif.status === "granted";
    } catch (notifErr) {
      console.warn("[Permissions] Notification request error:", notifErr);
    }
  } catch (err) {
    console.warn("[Permissions] requestAllLocationPermissions error:", err);
  }

  return { fgGranted, bgGranted, notificationsGranted };
}
