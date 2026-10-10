import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { BatteryLevelInfo } from "../types/models";

export interface StoredUserProfile {
  id: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean | null;
  phoneNumber: string | null;
  phoneVerified: boolean | null;
  metadata: Record<string, any> | null;
  avatar: string | null;
  plan: any | null;
  batteryLevel: BatteryLevelInfo | null;
  [key: string]: any;
}

export interface StoreCirclePrivacy {
  shareAvatar: boolean;
  shareBattery: boolean;
  shareLocation: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: StoredUserProfile | null;
  activeCircleId: string | null;
  isAuthenticated: boolean;
  updatefrequency: string | null;
  privacy: StoreCirclePrivacy | null;

  setAuth: (
    tokens: { accessToken: string; refreshToken: string },
    user: StoredUserProfile,
  ) => void;
  setAuthTokens: (accessToken: string, refreshToken: string) => void;
  updateToken: (accessToken: string) => void;
  updateUser: (user: Partial<StoredUserProfile>) => void;
  setActiveCircleId: (id: string | null) => void;
  setUpdateFrequency: (frequency: string | null) => void;
  setUpdatePrivacy: (privacy: StoreCirclePrivacy) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeCircleId: null,
      isAuthenticated: false,
      updatefrequency: "10000",
      privacy: {
        shareLocation: true,
        shareAvatar: true,
        shareBattery: true,
      },

      setAuth: (tokens, user) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      setAuthTokens: (accessToken, refreshToken) => {
        set({
          accessToken,
          refreshToken,
          isAuthenticated: Boolean(accessToken),
        });
      },

      updateToken: (accessToken) =>
        set({
          accessToken,
          isAuthenticated: Boolean(accessToken),
        }),

      updateUser: (updatedFields) => {
        set((state) => {
          const currentUser = state.user || ({} as StoredUserProfile);
          let newMetadata = currentUser.metadata;
          if (updatedFields.metadata !== undefined) {
            if (updatedFields.metadata === null) {
              newMetadata = null;
            } else {
              newMetadata = {
                ...currentUser.metadata,
                ...updatedFields.metadata,
              };
            }
          }

          let newBatteryLevel = currentUser.batteryLevel;
          if (updatedFields.batteryLevel !== undefined) {
            if (updatedFields.batteryLevel === null) {
              newBatteryLevel = null;
            } else {
              newBatteryLevel = {
                ...currentUser.batteryLevel,
                ...updatedFields.batteryLevel,
              };
            }
          }

          return {
            user: {
              ...currentUser,
              ...updatedFields,
              metadata: newMetadata,
              batteryLevel: newBatteryLevel,
            },
          };
        });
      },

      setActiveCircleId: (id) => set({ activeCircleId: id }),
      setUpdateFrequency: (frequency) => set({ updatefrequency: frequency }),
      setUpdatePrivacy: (privacy: StoreCirclePrivacy) =>
        set({ privacy: privacy }),

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeCircleId: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        activeCircleId: state.activeCircleId,
        isAuthenticated: state.isAuthenticated,
        updatefrequency: state.updatefrequency,
        privacy: state.privacy,
      }),
      onRehydrateStorage: () => (state) => {
        // Keep session valid after app restart if tokens were restored.
        if (state?.accessToken) {
          state.isAuthenticated = true;
        }
      },
    },
  ),
);

/** Wait for AsyncStorage auth restore before routing. */
export function useAuthHydration() {
  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
