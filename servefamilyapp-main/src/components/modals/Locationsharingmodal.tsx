import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
  AppState,
  NativeModules,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "@/src/constants/theme";
import { requestAllLocationPermissions } from "@/src/utils/locationPermissionHelper";
import {
  BACKGROUND_LOCATION_TASK_NAME,
  isNativePlatform,
  STORAGE_KEYS,
} from "@/src/constants/MapConstants";
import { useBackgroundTracker } from "@/src/hooks/useBackgroundTracker";
import { setLocationSharingEnabled } from "@/src/utils/tokenManager";
import { parseBooleanPreference } from "@/src/utils/mapUtils";
import ModalSafeArea from "@/src/components/ModalSafeArea";


const { BatteryOptimization } = NativeModules;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LocationSharingModalProps {
  visible: boolean;
  onClose: () => void;
  circleName?: string;
  insets: { top: number; bottom: number; left: number; right: number };
}

async function isBackgroundTaskRunning(): Promise<boolean> {
  if (!isNativePlatform) return false;
  try {
    return await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME,
    );
  } catch {
    return false;
  }
}

async function stopBackgroundTask(): Promise<void> {
  if (!isNativePlatform) return;
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME,
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    }
  } catch (err) {
    console.warn("Failed to stop background location task", err);
  }
}

function InfoRow({
  t,
  icon,
  title,
  description,
}: {
  t: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={{ flexDirection: "row", marginBottom: t.space[5] }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: t.radius.lg,
          backgroundColor: t.colors.primaryLight,
          alignItems: "center",
          justifyContent: "center",
          marginRight: t.space[3],
        }}
      >
        <Ionicons name={icon} size={18} color={t.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: t.typography.size.base,
            fontWeight: t.typography.weight.semibold,
            color: t.colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: t.typography.size.sm,
            lineHeight: t.typography.size.sm * t.typography.leading.normal,
            color: t.colors.textSecondary,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

const LocationSharingModal: React.FC<LocationSharingModalProps> = ({
  visible,
  onClose,
  circleName = "your family",
  insets,
}) => {
  const t = useTheme();
  const { startBackgroundTracking, stopBackgroundTracking } =
    useBackgroundTracker();
  const [fixingBackground, setFixingBackground] = useState(false);

  const [checking, setChecking] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [backgroundPermissionOk, setBackgroundPermissionOk] = useState(false);


  const [isIgnoringBatteryOptimizations, setIsIgnoringBatteryOptimizations] =
    useState(true);


  const backgroundOk =
    Platform.OS === "android"
      ? backgroundPermissionOk && isIgnoringBatteryOptimizations
      : backgroundPermissionOk;

  const checkBatteryOptimizations = useCallback(async () => {
    if (Platform.OS !== "android" || !BatteryOptimization) {
      return;
    }
    try {
      const isIgnoring =
        await BatteryOptimization.isIgnoringBatteryOptimizations();
      setIsIgnoringBatteryOptimizations(isIgnoring);
    } catch (e) {
      console.warn("Failed to check battery optimizations", e);
    }
  }, []);

  const handleRequestIgnoreBatteryOptimizations = useCallback(() => {
    if (Platform.OS === "android" && BatteryOptimization) {
      BatteryOptimization.requestIgnoreBatteryOptimizations();
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      const stored = await AsyncStorage.getItem(
        STORAGE_KEYS.locationSharingEnabled,
      );
      const preferenceOn = parseBooleanPreference(stored, true);

      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      const taskRunning = await isBackgroundTaskRunning();

      const actuallyOn = preferenceOn && fg.status === "granted";
      setSharingEnabled(actuallyOn);
      setBackgroundPermissionOk(
        actuallyOn && bg.status === "granted" && taskRunning,
      );

      // Battery optimization status only matters on Android; harmless no-op
      // on iOS since checkBatteryOptimizations early-returns there.
      await checkBatteryOptimizations();
    } finally {
      setChecking(false);
    }
  }, [checkBatteryOptimizations]);

  useEffect(() => {
    if (visible) refreshStatus();
  }, [visible, refreshStatus]);

  // Re-check everything whenever the user comes back to the app — e.g. after
  // granting "Always" location access on iOS, or disabling battery
  // optimization for the app on Android, from the system Settings screen.
  useEffect(() => {
    if (!visible) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [visible, refreshStatus]);

  const handleToggle = useCallback(
    async (value: boolean) => {
      setToggling(true);
      try {
        if (value) {
          const { fgGranted, bgGranted } = await requestAllLocationPermissions();
          if (!fgGranted) {
            Alert.alert(
              "Location permission needed",
              "Turn on location access for Serve Family in your device settings to share your position.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Open Settings",
                  onPress: () => Linking.openSettings(),
                },
              ],
            );
            return;
          }

          if (bgGranted) {
            await startBackgroundTracking();
          }

          await AsyncStorage.setItem(
            STORAGE_KEYS.locationSharingEnabled,
            "true",
          );
          setLocationSharingEnabled(true);
          setSharingEnabled(true);
          setBackgroundPermissionOk(bgGranted);

          if (Platform.OS === "android") {
            await checkBatteryOptimizations();
          }
        } else {
          await stopBackgroundTracking();
          await stopBackgroundTask();

          await AsyncStorage.setItem(
            STORAGE_KEYS.locationSharingEnabled,
            "false",
          );
          setLocationSharingEnabled(false);
          setSharingEnabled(false);
          setBackgroundPermissionOk(false);
        }
      } catch (err) {
        console.warn("Failed to toggle location sharing", err);
        Alert.alert("Something went wrong", "Please try again.");
      } finally {
        setToggling(false);
      }
    },
    [startBackgroundTracking, stopBackgroundTracking, checkBatteryOptimizations],
  );

  const handleFixBackground = useCallback(async () => {
    setFixingBackground(true);
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      console.log("bg permission result:", bg.status);

      if (bg.status === "granted") {
        await startBackgroundTracking();
        await new Promise((r) => setTimeout(r, 500));

        if (Platform.OS === "android" && !isIgnoringBatteryOptimizations) {
          handleRequestIgnoreBatteryOptimizations();
        }

        await refreshStatus();
      } else {
        const isAndroid = Platform.OS === "android";
        Alert.alert(
          "Background permission needed",
          isAndroid
            ? "Please enable 'Allow all the time' location access in Settings to fix background tracking."
            : "Please enable 'Always' location access in Settings to fix background tracking.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch (err) {
      console.warn("Failed to fix background tracking", err);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setFixingBackground(false);
    }
  }, [
    startBackgroundTracking,
    refreshStatus,
    isIgnoringBatteryOptimizations,
    handleRequestIgnoreBatteryOptimizations,
  ]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea
        style={{
          flex: 1,
          backgroundColor: t.colors.background,
        }}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: t.space[4],
            borderBottomWidth: 1,
            borderBottomColor: t.colors.border,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 32 }}>
            <Ionicons name="close" size={24} color={t.colors.textPrimary} />
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              marginRight: 32,
              fontSize: t.typography.size.lg,
              fontWeight: t.typography.weight.bold,
              color: t.colors.textPrimary,
            }}
          >
            Location Sharing
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: t.space[4],
            paddingTop: t.space[6],
          }}
          style={{ backgroundColor: t.colors.backgroundAlt }}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon + intro */}
          <View
            style={{
              alignSelf: "center",
              width: 64,
              height: 64,
              borderRadius: t.radius.full,
              backgroundColor: t.colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: t.space[4],
            }}
          >
            <Ionicons
              name={sharingEnabled ? "location" : "location-outline"}
              size={28}
              color={t.colors.primary}
            />
          </View>
          <Text
            style={{
              fontSize: t.typography.size.xl,
              fontWeight: t.typography.weight.bold,
              color: t.colors.textPrimary,
              textAlign: "center",
              marginBottom: t.space[1],
            }}
          >
            {sharingEnabled ? "Sharing Location" : "Location Hidden"}
          </Text>
          <Text
            style={{
              fontSize: t.typography.size.sm,
              color: t.colors.textTertiary,
              textAlign: "center",
              marginBottom: t.space[6],
              paddingHorizontal: t.space[4],
            }}
          >
            Control who can see your live location in {circleName}
          </Text>

          {/* Share my location card */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: t.radius.xl,
              padding: t.space[4],
              marginBottom: t.space[3],
              ...t.shadows.sm,
            }}
          >
            <View style={{ flex: 1, marginRight: t.space[3] }}>
              <Text
                style={{
                  fontSize: t.typography.size.base,
                  fontWeight: t.typography.weight.semibold,
                  color: t.colors.textPrimary,
                  marginBottom: 2,
                }}
              >
                Share my location
              </Text>
              <Text
                style={{
                  fontSize: t.typography.size.sm,
                  color: t.colors.textSecondary,
                  lineHeight:
                    t.typography.size.sm * t.typography.leading.normal,
                }}
              >
                Allow circle members to see your real-time position
              </Text>
            </View>
            {checking || toggling ? (
              <ActivityIndicator color={t.colors.primary} />
            ) : (
              <Switch
                value={sharingEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: t.colors.border, true: t.colors.primary }}
                thumbColor={
                  Platform.OS === "android" ? t.colors.surface : undefined
                }
              />
            )}
          </View>

          {/* Background tracking card */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor:
                backgroundOk || !sharingEnabled
                  ? t.colors.surface
                  : t.colors.warningBg,
              borderWidth: 1,
              borderColor:
                backgroundOk || !sharingEnabled
                  ? t.colors.border
                  : t.colors.warning,
              borderRadius: t.radius.xl,
              padding: t.space[4],
              marginBottom: t.space[6],
            }}
          >
            <View style={{ flex: 1, marginRight: t.space[3] }}>
              <Text
                style={{
                  fontSize: t.typography.size.base,
                  fontWeight: t.typography.weight.semibold,
                  color: t.colors.textPrimary,
                  marginBottom: 2,
                }}
              >
                Background Tracking
              </Text>
              <Text
                style={{
                  fontSize: t.typography.size.sm,
                  color: t.colors.textSecondary,
                  lineHeight:
                    t.typography.size.sm * t.typography.leading.normal,
                }}
              >
                {Platform.OS === "android"
                  ? "Allow continuous tracking when app is closed or battery saver is on."
                  : "Allow continuous tracking when the app is closed, using 'Always' location access."}
              </Text>
            </View>
            {sharingEnabled && !backgroundOk && !checking && (
              <Pressable
                onPress={handleFixBackground}
                disabled={fixingBackground}
                style={({ pressed }) => ({
                  backgroundColor: pressed
                    ? t.colors.warningText
                    : t.colors.warning,
                  borderRadius: t.radius.full,
                  paddingHorizontal: t.space[3],
                  paddingVertical: t.space[2],
                  opacity: fixingBackground ? 0.6 : 1,
                })}
              >
                {fixingBackground ? (
                  <ActivityIndicator
                    size="small"
                    color={t.colors.textOnPrimary}
                  />
                ) : (
                  <Text
                    style={{
                      color: t.colors.textOnPrimary,
                      fontSize: t.typography.size.sm,
                      fontWeight: t.typography.weight.semibold,
                    }}
                  >
                    Fix Now
                  </Text>
                )}
              </Pressable>
            )}
            {sharingEnabled && backgroundOk && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={t.colors.success}
              />
            )}
          </View>

          {/* About */}
          <Text
            style={{
              fontSize: t.typography.size.md,
              fontWeight: t.typography.weight.semibold,
              color: t.colors.textPrimary,
              marginBottom: t.space[4],
            }}
          >
            About Location Sharing
          </Text>

          <InfoRow
            t={t}
            icon="shield-checkmark"
            title="Private & Secure"
            description="Your location is only shared with members of your selected circle and is encrypted."
          />
          <InfoRow
            t={t}
            icon="battery-charging"
            title="Battery Optimized"
            description="Our smart tracking technology minimizes battery drain while providing accurate updates."
          />
          <InfoRow
            t={t}
            icon="notifications"
            title="Instant Alerts"
            description="Members get notified only if you've set up Place Alerts for specific locations."
          />

          <View style={{ height: t.space[10] }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            padding: t.space[4],
            paddingBottom: Platform.select({
              ios: insets.bottom || t.space[4],
              android: t.space[4],
            }),
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
            backgroundColor: t.colors.background,
          }}
        >
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: pressed
                ? t.colors.primaryDark
                : t.colors.primary,
              borderRadius: t.radius.lg,
              minHeight: 52,
              alignItems: "center",
              justifyContent: "center",
              ...t.shadows.md,
            })}
          >
            <Text
              style={{
                fontSize: t.typography.size.md,
                fontWeight: t.typography.weight.semibold,
                color: t.colors.textOnPrimary,
              }}
            >
              Done
            </Text>
          </Pressable>
        </View>
      </ModalSafeArea>
    </Modal>
  );
};

export default LocationSharingModal;