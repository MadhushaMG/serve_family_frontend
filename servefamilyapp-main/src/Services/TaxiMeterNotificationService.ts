import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const TAXI_METER_NOTIFICATION_ID = "taxi-meter-running-notification";
const TAXI_METER_CHANNEL_ID = "taxi-meter-channel";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export class TaxiMeterNotificationService {
  private static isInitialized = false;

  public static async initChannel() {
    if (Platform.OS === "android" && !this.isInitialized) {
      await Notifications.setNotificationChannelAsync(TAXI_METER_CHANNEL_ID, {
        name: "Taxi Meter Status",
        importance: Notifications.AndroidImportance.LOW,
        lightColor: "#16A34A",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: undefined,
      });
      this.isInitialized = true;
    }
  }

  public static async updateRunningNotification(
    liveFare: number,
    distanceMeters: number,
    elapsedSeconds: number,
    status: string
  ) {
    try {
      await this.initChannel();

      const distanceKm = (distanceMeters / 1000).toFixed(2);
      const formattedTime = formatDuration(elapsedSeconds);

      // Notification Title: Status & Price (LKR)
      const title = `🚕 Taxi Meter (${status.toUpperCase()}) - LKR ${liveFare.toFixed(2)}`;

      // Notification Body: Distance + Time + Action
      const body = `📏 Distance: ${distanceKm} km (${Math.round(distanceMeters)}m) | ⏱️ Time: ${formattedTime} | Tap to open app`;

      await Notifications.scheduleNotificationAsync({
        identifier: TAXI_METER_NOTIFICATION_ID,
        content: {
          title,
          body,
          data: { screen: "taxi-meter", action: "open_meter" },
          sticky: status === "running",
          autoDismiss: false,
          sound: false,
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null,
      });
    } catch (err) {
      console.warn("Failed to schedule taxi meter notification:", err);
    }
  }

  public static async dismissRunningNotification() {
    try {
      await Notifications.dismissNotificationAsync(TAXI_METER_NOTIFICATION_ID);
    } catch (err) {
      console.warn("Failed to dismiss taxi meter notification:", err);
    }
  }
}
