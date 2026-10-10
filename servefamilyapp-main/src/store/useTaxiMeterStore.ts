import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MeterStatus = "idle" | "running" | "paused" | "stopped";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
}

interface TaxiMeterState {
  status: MeterStatus;
  startTime: number | null;
  totalPausedDuration: number;
  pauseStartTime: number | null;
  distanceMeters: number;
  elapsedSeconds: number;
  currentSpeedKmH: number;
  baseFare: number;
  ratePerKm: number;
  liveFare: number;
  lastLocation: LocationPoint | null;
  isOverlayActive: boolean;
  isModalVisible: boolean;

  // Actions
  setStatus: (status: MeterStatus) => void;
  setBaseFare: (fare: number) => void;
  setRatePerKm: (rate: number) => void;
  setModalVisible: (visible: boolean) => void;
  setOverlayActive: (active: boolean) => void;
  updateLocation: (newPoint: LocationPoint, distanceIncrement: number, speedKmH: number) => void;
  syncElapsedTime: () => void;
  incrementTime: () => void;
  startMeter: () => void;
  pauseMeter: () => void;
  resumeMeter: () => void;
  stopMeter: () => void;
  resetMeter: () => void;
}

/**
 * Format seconds into HH:MM:SS format
 */
export function formatTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Calculates geodesic fare based on base fare (100 LKR base) and 10 LKR per 100m steps.
 */
export function calculateFare(distanceMeters: number, baseFare: number, ratePerKm: number): number {
  if (distanceMeters <= 0) return baseFare;

  const hundredMeterSteps = Math.floor(distanceMeters / 100);
  const remainingMeters = distanceMeters % 100;

  const stepFare = hundredMeterSteps * 10;
  const perMeterRate = ratePerKm / 1000;
  const remainingFare = remainingMeters * perMeterRate;

  const total = baseFare + stepFare + remainingFare;
  return Math.round(total * 100) / 100;
}

/**
 * Computes exact elapsed seconds based on startTime and totalPausedDuration
 */
export function calculateElapsedSeconds(
  startTime: number | null,
  totalPausedDuration: number,
  status: MeterStatus,
  pauseStartTime: number | null
): number {
  if (!startTime || status === "idle") return 0;
  const now = status === "paused" && pauseStartTime ? pauseStartTime : Date.now();
  return Math.max(0, Math.floor((now - startTime - totalPausedDuration) / 1000));
}

export const useTaxiMeterStore = create<TaxiMeterState>()(
  persist(
    (set, get) => ({
      status: "idle",
      startTime: null,
      totalPausedDuration: 0,
      pauseStartTime: null,
      distanceMeters: 0,
      elapsedSeconds: 0,
      currentSpeedKmH: 0,
      baseFare: 100,
      ratePerKm: 100,
      liveFare: 100,
      lastLocation: null,
      isOverlayActive: false,
      isModalVisible: false,

      setStatus: (status) => set({ status }),
      setBaseFare: (baseFare) => {
        const liveFare = calculateFare(get().distanceMeters, baseFare, get().ratePerKm);
        set({ baseFare, liveFare });
      },
      setRatePerKm: (ratePerKm) => {
        const liveFare = calculateFare(get().distanceMeters, get().baseFare, ratePerKm);
        set({ ratePerKm, liveFare });
      },
      setModalVisible: (isModalVisible) => set({ isModalVisible }),
      setOverlayActive: (isOverlayActive) => set({ isOverlayActive }),

      updateLocation: (newPoint, distanceIncrement, speedKmH) => {
        const state = get();
        const newDistance = state.distanceMeters + distanceIncrement;
        const newFare = calculateFare(newDistance, state.baseFare, state.ratePerKm);
        const elapsedSeconds = calculateElapsedSeconds(
          state.startTime,
          state.totalPausedDuration,
          state.status,
          state.pauseStartTime
        );

        set({
          lastLocation: newPoint,
          distanceMeters: newDistance,
          currentSpeedKmH: speedKmH,
          liveFare: newFare,
          elapsedSeconds,
        });
      },

      syncElapsedTime: () => {
        const state = get();
        if (state.status === "idle") return;
        const elapsedSeconds = calculateElapsedSeconds(
          state.startTime,
          state.totalPausedDuration,
          state.status,
          state.pauseStartTime
        );
        set({ elapsedSeconds });
      },

      incrementTime: () => {
        const state = get();
        const elapsedSeconds = calculateElapsedSeconds(
          state.startTime,
          state.totalPausedDuration,
          state.status,
          state.pauseStartTime
        );
        set({ elapsedSeconds });
      },

      startMeter: () => {
        const now = Date.now();
        set({
          status: "running",
          startTime: now,
          totalPausedDuration: 0,
          pauseStartTime: null,
          distanceMeters: 0,
          elapsedSeconds: 0,
          currentSpeedKmH: 0,
          liveFare: get().baseFare,
          lastLocation: null,
        });
      },

      pauseMeter: () => {
        const now = Date.now();
        set({
          status: "paused",
          pauseStartTime: now,
        });
      },

      resumeMeter: () => {
        const state = get();
        const now = Date.now();
        const pauseDuration = state.pauseStartTime ? now - state.pauseStartTime : 0;
        const totalPausedDuration = state.totalPausedDuration + pauseDuration;
        set({
          status: "running",
          pauseStartTime: null,
          totalPausedDuration,
        });
      },

      stopMeter: () => {
        const state = get();
        const elapsedSeconds = calculateElapsedSeconds(
          state.startTime,
          state.totalPausedDuration,
          state.status,
          state.pauseStartTime
        );
        set({
          status: "stopped",
          elapsedSeconds,
          currentSpeedKmH: 0,
          isOverlayActive: false,
        });
      },

      resetMeter: () =>
        set({
          status: "idle",
          startTime: null,
          totalPausedDuration: 0,
          pauseStartTime: null,
          distanceMeters: 0,
          elapsedSeconds: 0,
          currentSpeedKmH: 0,
          liveFare: get().baseFare,
          lastLocation: null,
          isOverlayActive: false,
        }),
    }),
    {
      name: "taxi-meter-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        status: state.status,
        startTime: state.startTime,
        totalPausedDuration: state.totalPausedDuration,
        pauseStartTime: state.pauseStartTime,
        distanceMeters: state.distanceMeters,
        elapsedSeconds: state.elapsedSeconds,
        baseFare: state.baseFare,
        ratePerKm: state.ratePerKm,
        liveFare: state.liveFare,
      }),
    }
  )
);
