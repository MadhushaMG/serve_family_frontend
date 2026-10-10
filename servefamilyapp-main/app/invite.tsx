import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuthHydration, useAuthStore } from "@/src/store/authStore";

export default function Invite() {
  const router = useRouter();
  const hasHydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!hasHydrated) return;

    if (isAuthenticated && accessToken) {
      router.replace("/(Dashboard)/Mapsrceen");
    } else {
      router.replace("/(auth)/RegisterScreen");
    }
  }, [hasHydrated, isAuthenticated, accessToken, router]);

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (isAuthenticated && accessToken) {
    return <Redirect href="/(Dashboard)/Mapsrceen" />;
  }

  return <Redirect href="/(auth)/RegisterScreen" />;
}
