import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import ServeFamilySplash from "@/src/components/SplashScreen";
import { useColorScheme } from "@/src/hooks/use-color-scheme";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { initializeCrashReporter } from "@/src/utils/crashReporter";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { SafeAreaProvider } from "react-native-safe-area-context";

initializeCrashReporter();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(attempt * 1000, 3000),
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

SplashScreen.preventAutoHideAsync();

import { IncomingBookingModal } from "@/src/components/IncomingBookingModal";
import { CustomerRideTrackingModal } from "@/src/components/modals/CustomerRideTrackingModal";
import { DriverActiveRideModal } from "@/src/components/modals/DriverActiveRideModal";
import {
  startDriverRideSearchBackgroundTask,
  stopDriverRideSearchBackgroundTask,
} from "@/src/Services/DriverRideSearchBackgroundTask";
import { setupTaxiNotificationChannel } from "@/src/utils/notificationListeners";
import { initTaxiSocket } from "@/src/Services/TaxiSocketService";
import { useAuthStore } from "@/src/store/authStore";
import { useActiveBookingStore } from "@/src/store/useActiveBookingStore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const url = Linking.useURL();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    setupTaxiNotificationChannel();
    // Initialize root-level socket for uninterrupted driver & passenger real-time tracking
    initTaxiSocket(undefined, user?.id || undefined);
  }, [user?.id]);

  // Auto-restore background driver ride search task ONLY if user is a confirmed online driver
  useEffect(() => {
    async function restoreDriverTask() {
      try {
        const isOnline = await AsyncStorage.getItem("@driver_is_online");
        const userRole = (await AsyncStorage.getItem("userRole")) || (await AsyncStorage.getItem("auth:userRole"));
        const isDriver = userRole && (userRole.toLowerCase() === "driver" || userRole.toLowerCase() === "admin");

        if (isOnline === "true" && isDriver) {
          console.log("🔄 Auto-restoring Driver Ride Search Background Task on launch...");
          await startDriverRideSearchBackgroundTask();
        } else {
          // If passenger or offline, ensure background task & persistent notification are STOPPED
          await stopDriverRideSearchBackgroundTask();
        }
      } catch (e) {
        console.warn("Failed to check driver background task status:", e);
      }
    }
    restoreDriverTask();
    useActiveBookingStore.getState().loadActiveBooking();
  }, []);

  useEffect(() => {
    const handleUrl = async (urlStr: string | null) => {
      if (!urlStr) return;
      try {
        const parsed = Linking.parse(urlStr);
        if (parsed.queryParams && parsed.queryParams.ref) {
          const refCode = parsed.queryParams.ref as string;
          await AsyncStorage.setItem("pendingReferralCode", refCode);
          console.log("✅ Stored pending referral code:", refCode);
        }
      } catch (error) {
        console.error("Failed to parse URL or store referral code", error);
      }
    };

    handleUrl(url);
  }, [url]);

  useEffect(() => {
    async function prepareApp() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn("Preparation Error:", e);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepareApp();
  }, []);

  if (!appReady || !splashFinished) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ServeFamilySplash onAnimationFinish={() => setSplashFinished(true)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: asyncStoragePersister }}
            onSuccess={() => {
              queryClient.resumePausedMutations().catch((e) => console.error(e));
            }}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>
              <ThemeProvider
                value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
              >
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: "slide_from_right",
                    gestureEnabled: true,
                    gestureDirection: "horizontal",
                  }}
                >
                  <Stack.Screen name="index" options={{ animation: "fade" }} />
                </Stack>

                <StatusBar
                  style={colorScheme === "dark" ? "light" : "dark"}
                  backgroundColor="transparent"
                  translucent={true}
                />
                {/* Global Rider Alert Pop-up Modal */}
                <IncomingBookingModal />

                {/* Global Passenger Active Ride Searching & Tracking Modal */}
                <CustomerRideTrackingModal />

                {/* Global Driver Active Ride Control Panel Modal */}
                <DriverActiveRideModal />
              </ThemeProvider>
            </GestureHandlerRootView>
          </PersistQueryClientProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
