import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "@/src/api/apiClient";

export interface DriverVehicleInfo {
  id?: string;
  vehicleRegNum?: string;
  model?: string;
  color?: string;
  driverName?: string;
  driverPhone?: string;
  driverAvatar?: string;
  rating?: number;
}

export interface BookingResponseData {
  id: string;
  isWaiting?: boolean;
  waitingMinutes?: number;
  waitingFare?: number;
  userId?: string;
  vehicleId?: string | null;
  pickupLat?: number;
  pickupLng?: number;
  dropLat?: number;
  dropLng?: number;
  pickupAddress?: string;
  dropAddress?: string;
  distance?: number;
  fare?: number;
  status?: string;
  vehicle?: DriverVehicleInfo | null;
  updatedAt?: string;
  createdAt?: string;
}

interface ActiveBookingState {
  activeBookingId: string | null;
  activeBookingData: BookingResponseData | null;
  driverLocation: { latitude: number; longitude: number } | null;
  isPolling: boolean;
  
  setActiveBooking: (data: BookingResponseData) => Promise<void>;
  clearActiveBooking: () => Promise<void>;
  loadActiveBooking: () => Promise<void>;
  fetchBookingDetails: () => Promise<BookingResponseData | null>;
  updateDriverLocation: (lat: number, lng: number) => void;
  startPolling: () => void;
  stopPolling: () => void;
}

const STORAGE_KEY = "@active_taxi_booking";
let pollTimer: ReturnType<typeof setInterval> | null = null;

function firstNonEmpty(...values: any[]): string | undefined {
  for (const v of values) {
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      return String(v);
    }
  }
  return undefined;
}

function normalizeVehicle(raw: any): DriverVehicleInfo | null {
  if (!raw) return null;
  const v = raw.vehicle || raw;
  const driver = v.driver || raw.driver || v.driverInfo || {};

  const driverName = firstNonEmpty(
    driver.name,
    driver.fullName,
    driver.full_name,
    driver.firstName && driver.lastName ? `${driver.firstName} ${driver.lastName}` : undefined,
    driver.firstName,
    v.driverName,
    v.driver_name,
    raw.driverName,
    raw.driver_name,
  );

  const driverPhone = firstNonEmpty(
    driver.phone,
    driver.phoneNumber,
    driver.phone_number,
    driver.mobileNum,
    driver.mobile,
    v.driverPhone,
    v.driver_phone,
    raw.driverPhone,
  );

  const vehicleRegNum = firstNonEmpty(
    v.vehicleRegNum,
    v.regNumber,
    v.reg_number,
    v.plateNumber,
    v.plate_number,
    v.registrationNumber,
    v.registration_number,
    raw.vehicleRegNum,
  );

  const hasAny =
    driverName || driverPhone || vehicleRegNum ||
    v.model || v.color || v.driverAvatar || driver.avatar;

  if (!hasAny) return null;

  return {
    id: firstNonEmpty(v.id, v.vehicleId, raw.vehicleId),
    vehicleRegNum,
    model: firstNonEmpty(v.model, v.vehicleModel, v.make_model),
    color: firstNonEmpty(v.color, v.vehicleColor),
    driverName,
    driverPhone,
    driverAvatar: firstNonEmpty(driver.avatar, driver.profileImage, v.driverAvatar),
    rating: driver.rating ?? v.rating,
  };
}

function normalizeBooking(payload: any): BookingResponseData {
  if (!payload) return payload;
  const inner = payload.data || payload;
  const rawId = inner.id ?? inner.bookingId ?? inner._id ?? payload.id ?? payload.bookingId ?? payload._id;
  const id = rawId != null ? String(rawId) : "";
  return {
    ...inner,
    id,
    vehicle: normalizeVehicle(inner.vehicle || inner),
  };
}

export const useActiveBookingStore = create<ActiveBookingState>((set, get) => ({
  activeBookingId: null,
  activeBookingData: null,
  driverLocation: null,
  isPolling: false,

  updateDriverLocation: (lat: number, lng: number) => {
    set({ driverLocation: { latitude: lat, longitude: lng } });
  },

  setActiveBooking: async (data: BookingResponseData) => {
    const normalized = normalizeBooking(data);
    const bookingId = normalized.id;
    set({ activeBookingId: bookingId, activeBookingData: normalized });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      console.log("✅ Stored active booking ID:", bookingId);
    } catch (e) {
      console.error("Failed to store active booking in AsyncStorage:", e);
    }
    // Start 5s status polling automatically
    get().startPolling();
  },

  clearActiveBooking: async () => {
    get().stopPolling();
    set({ activeBookingId: null, activeBookingData: null, driverLocation: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("🧹 Cleared active booking");
    } catch (e) {
      console.error("Failed to clear active booking from AsyncStorage:", e);
    }
  },

  loadActiveBooking: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: BookingResponseData = normalizeBooking(JSON.parse(stored));
        if (parsed && parsed.id) {
          set({ activeBookingId: parsed.id, activeBookingData: parsed });
          console.log("🔄 Restored active booking ID:", parsed.id);

          if (parsed.status !== "completed" && parsed.status !== "cancelled") {
            get().startPolling();
          }
        }
      }
    } catch (e) {
      console.error("Failed to load active booking from AsyncStorage:", e);
    }
  },

  fetchBookingDetails: async (): Promise<BookingResponseData | null> => {
    const { activeBookingId } = get();
    if (!activeBookingId) return null;

    try {
      console.log(`🔄 Polling GET /api/taxi/booking/${activeBookingId}`);
      const response = await apiClient.get(`/taxi/booking/${activeBookingId}`);
      
      const rawPayload = response?.data || response;
      if (rawPayload) {
        const normalized = normalizeBooking(rawPayload);
        if (normalized && normalized.id) {
          set({ activeBookingData: normalized });

          // Auto-save updated status in storage
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)).catch(() => {});

          // If completed or cancelled, stop polling
          if (normalized.status === "completed" || normalized.status === "cancelled") {
            console.log(`🏁 Booking status is ${normalized.status}. Stopping polling.`);
            get().stopPolling();
          }

          return normalized;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error polling booking status:`, error);
    }
    return null;
  },

  startPolling: () => {
    const { isPolling, activeBookingId } = get();
    if (pollTimer || !activeBookingId) return;

    set({ isPolling: true });
    // Execute immediately once
    get().fetchBookingDetails();

    // Poll every 5 seconds for fast PickMe-style status updates
    pollTimer = setInterval(() => {
      get().fetchBookingDetails();
    }, 5000);

    console.log("⏱️ Started 5-second polling for active booking status");
  },

  stopPolling: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    set({ isPolling: false });
    console.log("🛑 Stopped booking status polling");
  },
}));
