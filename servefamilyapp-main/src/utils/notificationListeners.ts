import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import { useIncomingBookingStore } from "@/src/store/useIncomingBookingStore";
import {
  PENDING_INCOMING_BOOKING_KEY,
  TAXI_ALERT_CHANNEL_ID,
} from "@/src/utils/notificationBackgroundHandler";

const PENDING_BOOKING_MAX_AGE_MS = 2 * 60 * 1000;

export async function setupTaxiNotificationChannel() {
  try {
    if (Platform.OS === "android") {
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
    }
  } catch (err) {
    console.warn("Failed to create Notifee notification channel", err);
  }
}

export type NotificationNavigationHandler = (
  data: Record<string, string | undefined>,
) => void;

export interface NotificationListenerOptions {
  onNavigate?: NotificationNavigationHandler;
  onNotificationReceived?: (
    remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  ) => void;
}

let notificationReceptionEnabled = false;
let activeListenerCleanup: (() => void) | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toBookingData = (data: Record<string, any>) => ({
  bookingId: (data.bookingId as string) || "B1001",
  customerName: (data.customerName as string) || "Customer Request",
  customerPhone: (data.customerPhone as string) || "",
  pickupLocation:
    (data.pickupLocation as string) ||
    (data.pickupAddress as string) ||
    "Current Pickup Location",
  dropoffLocation:
    (data.dropoffLocation as string) ||
    (data.dropAddress as string) ||
    "Destination Location",
  fare: (data.fare as string) || "450.00",
  distance: (data.distance as string) || "3.5 km",
  vehicleType: (data.vehicleType as string) || "Tuk Tuk",
});

const isRideRequest = (data: Record<string, any> | undefined): boolean => {
  if (!data) return false;
  return (
    data.type === "TAXI_BOOKING_REQUEST" ||
    data.type === "TAXI_BOOKING_BROADCAST" ||
    data.type === "NEW_BOOKING" ||
    !!data.bookingId
  );
};

const consumePendingIncomingBooking = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_INCOMING_BOOKING_KEY);
    if (!raw) return;

    await AsyncStorage.removeItem(PENDING_INCOMING_BOOKING_KEY);

    const parsed = JSON.parse(raw) as Record<string, any> & { receivedAt?: number };
    if (
      parsed.receivedAt &&
      Date.now() - parsed.receivedAt > PENDING_BOOKING_MAX_AGE_MS
    ) {
      return;
    }

    useIncomingBookingStore.getState().triggerIncomingBooking(toBookingData(parsed));
  } catch (err) {
    console.warn("Failed to consume pending incoming booking", err);
  }
};

const getTitleAndBody = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): { title: string; body: string | undefined } => {
  const data = remoteMessage.data;

  const title =
    remoteMessage.notification?.title ??
    (typeof data?.title === "string" ? data.title : undefined) ??
    "Notification";

  const body =
    remoteMessage.notification?.body ??
    (typeof data?.body === "string" ? data.body : undefined) ??
    (typeof data?.message === "string" ? data.message : undefined) ??
    (typeof data?.alert === "string" ? data.alert : undefined) ??
    undefined;

  return { title, body };
};

const displayForegroundAlert = (title: string, body?: string) => {
  if (!title && !body) return;

  if (Platform.OS === "android") {
    const toastContent = body
      ? `${title ? `${title}: ` : ""}${body}`
      : title;
    ToastAndroid.showWithGravity(
      toastContent,
      ToastAndroid.LONG,
      ToastAndroid.TOP,
    );
    return;
  }

  Alert.alert(title || "Notification", body);
};

const handleNavigationIntent = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
  onNavigate?: NotificationNavigationHandler,
) => {
  if (!onNavigate) return;

  const data = remoteMessage.data ?? {};
  if (Object.keys(data).length === 0) return;

  try {
    onNavigate(data as Record<string, string | undefined>);
  } catch (handlerError) {
    console.warn("Notification navigation handler threw", handlerError);
  }
};

const triggerBookingFromRemoteMessage = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const data = (remoteMessage.data ?? {}) as Record<string, any>;
  if (!isRideRequest(data)) return false;
  useIncomingBookingStore.getState().triggerIncomingBooking(toBookingData(data));
  return true;
};

// ─── Foreground display for ride requests ────────────────────────────────────

const displayForegroundRideNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  if (Platform.OS !== "android") return;

  try {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? "New Ride Request! 🚕",
      body:
        remoteMessage.notification?.body ??
        "You have a new taxi request nearby.",
      data: (remoteMessage.data ?? {}) as Record<string, string>,
      android: {
        channelId: TAXI_ALERT_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: "default",
        loopSound: false,
        autoCancel: true,
        smallIcon: "ic_launcher",
        pressAction: { id: "default", launchActivity: "default" },
      },
    });
  } catch (err) {
    console.warn("Failed to display foreground ride notification", err);
  }
};

// ─── Listener Registration ────────────────────────────────────────────────────

export const registerNotificationListeners = (
  options?: NotificationListenerOptions,
): (() => void) => {
  if (Platform.OS === "web") {
    return () => undefined;
  }

  let cancelled = false;

  let unsubscribeForeground: (() => void) | undefined;
  let unsubscribeNotificationOpened: (() => void) | undefined;

  // Flush any booking that arrived while JS was torn down
  consumePendingIncomingBooking();

  try {
    unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      if (cancelled) return;

      if (triggerBookingFromRemoteMessage(remoteMessage)) {
        // Also show a heads-up / full-screen notification so the user hears it
        // even if the modal is covered or the screen is off.
        displayForegroundRideNotification(remoteMessage);
      } else if (options?.onNotificationReceived) {
        options.onNotificationReceived(remoteMessage);
      } else {
        const { title, body } = getTitleAndBody(remoteMessage);
        displayForegroundAlert(title, body);
      }

      handleNavigationIntent(remoteMessage, options?.onNavigate);
    });
  } catch (error) {
    console.warn("Failed to register foreground notification listener", error);
  }

  try {
    unsubscribeNotificationOpened = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        if (cancelled) return;
        triggerBookingFromRemoteMessage(remoteMessage);
        handleNavigationIntent(remoteMessage, options?.onNavigate);
      },
    );
  } catch (error) {
    console.warn("Failed to register notification opened listener", error);
  }

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (cancelled || !remoteMessage) return;
      triggerBookingFromRemoteMessage(remoteMessage);
      handleNavigationIntent(remoteMessage, options?.onNavigate);
    })
    .catch((error) => {
      console.warn("Failed to get initial notification", error);
    });

  return () => {
    cancelled = true;

    try {
      unsubscribeForeground?.();
    } catch (error) {
      console.warn("Error cleaning up foreground listener", error);
    }

    try {
      unsubscribeNotificationOpened?.();
    } catch (error) {
      console.warn("Error cleaning up opened listener", error);
    }
  };
};

// ─── Enable / Disable ─────────────────────────────────────────────────────────

export const setNotificationReceptionEnabled = async (
  enabled: boolean,
  options?: NotificationListenerOptions,
): Promise<void> => {
  if (enabled) {
    if (notificationReceptionEnabled && !options) {
      return;
    }

    if (activeListenerCleanup) {
      try {
        activeListenerCleanup();
      } catch (cleanupError) {
        console.warn(
          "Error clearing existing notification listeners",
          cleanupError,
        );
      }
      activeListenerCleanup = null;
    }

    try {
      activeListenerCleanup = registerNotificationListeners(options);
      notificationReceptionEnabled = true;
    } catch (registrationError) {
      notificationReceptionEnabled = false;
      activeListenerCleanup = null;
      console.warn("Failed to register notification listeners", registrationError);
    }

    return;
  }

  // Disable path
  if (!notificationReceptionEnabled) {
    return;
  }

  notificationReceptionEnabled = false;

  if (activeListenerCleanup) {
    try {
      activeListenerCleanup();
    } catch (cleanupError) {
      console.warn("Error cleaning up notification listeners", cleanupError);
    }
    activeListenerCleanup = null;
  }
};
