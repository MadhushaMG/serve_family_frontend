import messaging from "@react-native-firebase/messaging";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const TAXI_ALERT_CHANNEL_ID = "taxi_alert_channel";
export const PENDING_INCOMING_BOOKING_KEY = "@pending_incoming_booking";

const isRideRequest = (data: Record<string, any> | undefined): boolean => {
  if (!data) return false;
  return (
    data.type === "TAXI_BOOKING_REQUEST" ||
    data.type === "TAXI_BOOKING_BROADCAST" ||
    data.type === "NEW_BOOKING" ||
    !!data.bookingId
  );
};

const ensureChannel = async () => {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: TAXI_ALERT_CHANNEL_ID,
    name: "Taxi Ride Requests & Alerts",
    description: "Urgent incoming ride requests for taxi drivers",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: "default",
    vibration: true,
    vibrationPattern: [0, 250, 250, 250],
  });
};

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const data = (remoteMessage?.data ?? {}) as Record<string, any>;

  if (!isRideRequest(data)) {
    return;
  }

  try {
    await AsyncStorage.setItem(
      PENDING_INCOMING_BOOKING_KEY,
      JSON.stringify({
        bookingId: data.bookingId ?? "B1001",
        customerName: data.customerName ?? "Customer Request",
        customerPhone: data.customerPhone ?? "",
        pickupLocation:
          data.pickupLocation ?? data.pickupAddress ?? "Current Pickup Location",
        dropoffLocation:
          data.dropoffLocation ?? data.dropAddress ?? "Destination Location",
        fare: data.fare ?? "450.00",
        distance: data.distance ?? "3.5 km",
        vehicleType: data.vehicleType ?? "Tuk Tuk",
        receivedAt: Date.now(),
      }),
    );
  } catch (err) {
    console.warn("Failed to persist pending incoming booking", err);
  }

  try {
    await ensureChannel();

    await notifee.displayNotification({
      title:
        remoteMessage?.notification?.title ?? "New Ride Request! 🚕",
      body:
        remoteMessage?.notification?.body ??
        "You have a new taxi request nearby. Tap to respond.",
      data: data as Record<string, string>,
      android: {
        channelId: TAXI_ALERT_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: "default",
        loopSound: false,
        ongoing: false,
        autoCancel: true,
        smallIcon: "ic_launcher",
        pressAction: { id: "default", launchActivity: "default" },
      },
    });
  } catch (err) {
    console.warn("Failed to display background ride notification", err);
  }
});
