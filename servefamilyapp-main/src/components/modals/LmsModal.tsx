import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { getUserProfile } from "@/src/utils/tokenManager";
import { useAuthStore } from "@/src/store/authStore";

interface LmsModalProps {
  visible: boolean;
  onClose: () => void;
  circleId?: string;
  circleName?: string;
}

export const BASE_LMS_URL = "https://www.servefamily.com/mcq/index.html";

const LmsModal: React.FC<LmsModalProps> = ({ visible, onClose, circleId, circleName }) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [lmsUrl, setLmsUrl] = useState<string>(BASE_LMS_URL);

  useEffect(() => {
    async function buildUrl() {
      try {
        const storeUser = useAuthStore.getState().user;
        const profile = await getUserProfile();

        const uid =
          storeUser?.id ||
          (storeUser as any)?._id ||
          (storeUser as any)?.userId ||
          profile?.id ||
          "";
        const userName =
          storeUser?.name ||
          (storeUser as any)?.fullName ||
          (storeUser as any)?.username ||
          profile?.name ||
          "";

        let pkgName = "Free";
        const rawPlan =
          storeUser?.plan ||
          (storeUser as any)?.subscriptionPlan ||
          (storeUser as any)?.package ||
          profile?.plan;

        if (rawPlan) {
          if (typeof rawPlan === "object") {
            pkgName = rawPlan.name || rawPlan.plan || rawPlan.packageName || "Free";
          } else if (typeof rawPlan === "string") {
            try {
              const parsed = JSON.parse(rawPlan);
              pkgName = parsed.name || parsed.plan || rawPlan;
            } catch {
              pkgName = rawPlan;
            }
          }
        }

        const circleIdParam = circleId ? `&circleid=${encodeURIComponent(circleId)}` : "";
        const circleNameParam = circleName ? `&circlename=${encodeURIComponent(circleName)}` : "";
        const fullUrl = `${BASE_LMS_URL}?uid=${encodeURIComponent(uid)}&user=${encodeURIComponent(userName)}&package=${encodeURIComponent(pkgName)}${circleIdParam}${circleNameParam}`;
        console.log("🔗 Dynamically bound LMS Portal URL:", fullUrl);
        setLmsUrl(fullUrl);
      } catch (err) {
        console.warn("Failed to build LMS URL with user profile:", err);
      }
    }

    if (visible) {
      buildUrl();
    }
  }, [visible, circleId, circleName]);

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleBackPress}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

        {/* Top-Left Back Button */}
        <TouchableOpacity
          onPress={handleBackPress}
          activeOpacity={0.8}
          style={styles.floatingBackButton}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: lmsUrl }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={styles.loadingText}>Loading MCQ Portal...</Text>
              </View>
            )}
            style={styles.webView}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loadingText}>Loading MCQ Portal...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default LmsModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0,
  },
  floatingBackButton: {
    position: "absolute",
    top: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 12,
    left: 16,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  webViewContainer: {
    flex: 1,
    position: "relative",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
});
