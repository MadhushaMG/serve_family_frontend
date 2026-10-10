import { useAuthHydration, useAuthStore } from "@/src/store/authStore";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const hasHydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Wait until persisted login is restored from storage.
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

  return <Redirect href="/WalkthroughScreen" />;
}
