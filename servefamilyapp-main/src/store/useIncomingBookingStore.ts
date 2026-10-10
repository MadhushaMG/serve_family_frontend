import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { playIncomingRingtone, stopIncomingRingtone } from "@/src/Services/audioService";
import { Vibration } from "react-native";
import apiClient from "@/src/api/apiClient";
import { useAuthStore } from "./authStore";

export interface IncomingBookingData {
  bookingId: string;
  customerName: string;
  customerPhone?: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  fare: string | number;
  distance: string | number;
  paymentMethod?: string;
  vehicleType?: string;
}

export type DriverRideStatus = "accepted" | "arrived" | "started" | "completed" | "cancelled";

export interface ActiveDriverRide {
  bookingId: string;
  status: DriverRideStatus;
  bookingData: IncomingBookingData;
}

interface IncomingBookingState {
  isModalVisible: boolean;
  bookingData: IncomingBookingData | null;
  countdown: number;
  isAccepting: boolean;
  activeDriverRide: ActiveDriverRide | null;
  isUpdatingStatus: boolean;
  
  // Actions
  triggerIncomingBooking: (data: IncomingBookingData) => void;
  acceptBooking: () => Promise<boolean>;
  updateDriverStatus: (newStatus: DriverRideStatus) => Promise<boolean>;
  rejectBooking: () => void;
  clearBooking: () => void;
  clearActiveDriverRide: () => void;
  setCountdown: (val: number) => void;
}

const DEFAULT_COUNTDOWN = 30;

export const useIncomingBookingStore = create<IncomingBookingState>((set, get) => ({
  isModalVisible: false,
  bookingData: null,
  countdown: DEFAULT_COUNTDOWN,
  isAccepting: false,
  activeDriverRide: null,
  isUpdatingStatus: false,

  triggerIncomingBooking: async (data: IncomingBookingData) => {
    try {
      const storedRole = (await AsyncStorage.getItem('userRole')) || (await AsyncStorage.getItem('auth:userRole'));
      const authUser = useAuthStore.getState().user;
      const role = storedRole || authUser?.metadata?.role || authUser?.role;
      const isDriver = role && (role.toLowerCase() === 'driver' || role.toLowerCase() === 'admin');
      if (!isDriver) {
        console.log("ℹ️ Ignoring incoming booking trigger for non-driver role:", role);
        return;
      }

      const isOnline = await AsyncStorage.getItem('@driver_is_online');
      if (isOnline !== 'true') {
        console.log("ℹ️ Driver is offline, ignoring incoming booking:", data.bookingId);
        return;
      }

      const currentUserId = authUser?.id || authUser?._id;
      if (currentUserId && (data as any)?.userId && String((data as any).userId) === String(currentUserId)) {
        console.log("ℹ️ Ignoring incoming booking created by current user themselves:", data.bookingId);
        return;
      }

      const dismissedRaw = await AsyncStorage.getItem('@dismissed_booking_ids');
      const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      if (dismissedIds.includes(String(data.bookingId))) {
        console.log("ℹ️ Ignoring dismissed booking:", data.bookingId);
        return;
      }
    } catch (e) {
      console.warn("Could not determine userRole in triggerIncomingBooking:", e);
      return;
    }

    stopIncomingRingtone();
    playIncomingRingtone();
    try {
      // Vibrate once only, do not pass true to avoid infinite loop
      Vibration.vibrate([0, 500, 300, 500], false);
    } catch (e) {
      console.warn("Vibration failed:", e);
    }

    set({
      isModalVisible: true,
      bookingData: data,
      countdown: DEFAULT_COUNTDOWN,
      isAccepting: false,
    });
  },

  acceptBooking: async () => {
    const { bookingData } = get();
    if (!bookingData || !bookingData.bookingId) {
      stopIncomingRingtone();
      set({ isModalVisible: false, bookingData: null, countdown: DEFAULT_COUNTDOWN });
      return false;
    }

    set({ isAccepting: true });
    stopIncomingRingtone();
    try {
      Vibration.cancel();
    } catch (e) {}

    try {
      console.log(`📡 Sending ACCEPT API call for bookingId: ${bookingData.bookingId}`);
      const res = await apiClient.patch(`/taxi/booking/${bookingData.bookingId}/accept`);
      console.log("✅ Booking accepted API response:", res);

      set({
        isModalVisible: false,
        bookingData: null,
        countdown: DEFAULT_COUNTDOWN,
        isAccepting: false,
        activeDriverRide: {
          bookingId: bookingData.bookingId,
          status: "accepted",
          bookingData: bookingData,
        },
      });
      return true;
    } catch (error) {
      console.error("❌ Failed to accept booking via API:", error);
      set({
        isModalVisible: false,
        bookingData: null,
        countdown: DEFAULT_COUNTDOWN,
        isAccepting: false,
      });
      return false;
    }
  },

  updateDriverStatus: async (newStatus: DriverRideStatus) => {
    const { activeDriverRide } = get();
    if (!activeDriverRide || !activeDriverRide.bookingId) return false;

    set({ isUpdatingStatus: true });
    try {
      console.log(`📡 Sending PATCH status '${newStatus}' for bookingId: ${activeDriverRide.bookingId}`);
      
      const payload = { status: newStatus };
      const res = await apiClient.patch(
        `/taxi/booking/${activeDriverRide.bookingId}/status`,
        payload
      );
      console.log(`✅ Status updated to '${newStatus}' API response:`, res);

      if (newStatus === "completed" || newStatus === "cancelled") {
        set({
          activeDriverRide: null,
          isUpdatingStatus: false,
        });
      } else {
        set({
          activeDriverRide: {
            ...activeDriverRide,
            status: newStatus,
          },
          isUpdatingStatus: false,
        });
      }
      return true;
    } catch (error) {
      console.error(`❌ Failed to update status to '${newStatus}':`, error);
      set({ isUpdatingStatus: false });
      return false;
    }
  },

  rejectBooking: () => {
    stopIncomingRingtone();
    try {
      Vibration.cancel();
    } catch (e) {}

    const { bookingData } = get();
    if (bookingData?.bookingId) {
      console.log("❌ Booking rejected:", bookingData.bookingId);
      AsyncStorage.getItem("@dismissed_booking_ids")
        .then((raw) => {
          const list: string[] = raw ? JSON.parse(raw) : [];
          if (!list.includes(String(bookingData.bookingId))) {
            list.push(String(bookingData.bookingId));
            if (list.length > 50) list.shift();
            return AsyncStorage.setItem("@dismissed_booking_ids", JSON.stringify(list));
          }
        })
        .catch(() => {});
    }

    set({
      isModalVisible: false,
      bookingData: null,
      countdown: DEFAULT_COUNTDOWN,
    });
  },

  clearBooking: () => {
    stopIncomingRingtone();
    try {
      Vibration.cancel();
    } catch (e) {}

    set({
      isModalVisible: false,
      bookingData: null,
      countdown: DEFAULT_COUNTDOWN,
    });
  },

  clearActiveDriverRide: () => {
    set({ activeDriverRide: null });
  },

  setCountdown: (val: number) => {
    set({ countdown: val });
  },
}));
