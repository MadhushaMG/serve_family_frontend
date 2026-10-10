import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/constants/theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MapFabRowProps {
  /** Same shared value driving the bottom sheet — keeps this row positioned higher above it. */
  animatedPosition: SharedValue<number>;
  onLocatePress: () => void;
  onSosPress: () => void;
  isSendingSos?: boolean;
  onLayersPress: () => void;
  bottomInset?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MapFabRow({
  animatedPosition,
  onLocatePress,
  onSosPress,
  isSendingSos = false,
  onLayersPress,
  bottomInset = 0,
}: MapFabRowProps) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const fabAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const sheetTopY = animatedPosition.value;
    const maxTop = SCREEN_HEIGHT - (bottomInset + 60);
    const clampedTop = Math.max(
      SCREEN_HEIGHT * 0.17,
      Math.min(sheetTopY, maxTop),
    );
    // Positioned higher up (+32px gap above drawer) + OS navigation bar height
    const bottom = SCREEN_HEIGHT - clampedTop + 32 + bottomInset;
    return { bottom };
  }, [bottomInset]);

  return (
    <Animated.View style={[styles.bottomFabRow, fabAnimatedStyle]} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.roundButton}
        onPress={onLocatePress}
      >
        <Ionicons name="locate" size={22} color="#2563EB" />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.sosButton}
        onPress={onSosPress}
        disabled={isSendingSos}
      >
        <MaterialCommunityIcons name="lifebuoy" size={20} color="#FFFFFF" />
        <Text style={styles.sosLabel}>{isSendingSos ? "Sending..." : "SOS"}</Text>
        {isSendingSos && (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
            style={styles.spinner}
          />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.roundButton}
        onPress={onLayersPress}
      >
        <MaterialCommunityIcons name="layers-outline" size={24} color="#2563EB" />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — clean white cards, blue/green theme, elevated floating buttons
// ─────────────────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    bottomFabRow: {
      position: "absolute",
      left: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 10,
    },
    roundButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      ...Platform.select({
        ios: {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    sosButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#DC2626",
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: "#B91C1C",
      ...Platform.select({
        ios: {
          shadowColor: "#DC2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    sosLabel: {
      color: "#FFFFFF",
      fontWeight: "700",
      fontSize: 14,
    },
    spinner: {
      marginLeft: 8,
    },
  });
}