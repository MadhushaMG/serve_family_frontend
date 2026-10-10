import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useTheme } from "@/src/constants/theme";

import { useAuthStore } from "@/src/store/authStore";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MapTabKey = "location" | "taxi" | "driver" | "meter" | "payments" | "lms";

export interface MapTabBarProps {
  activeTab: MapTabKey;
  onTabPress: (key: MapTabKey) => void;
  userRole?: string | null;
  metadata?: any;
  userRegion?: string | null;
  user?: any;
  isCovered?: boolean;
}

export function evaluateCoverage(
  userObj?: any,
  metadataObj?: any,
  explicitCovered?: boolean,
): boolean {
  if (typeof explicitCovered === "boolean") {
    return explicitCovered;
  }

  // 1. Direct user properties from login / profile
  const userStatus = (
    userObj?.coverageStatus ||
    userObj?.covering ||
    userObj?.coverage ||
    userObj?.status ||
    ""
  )
    .toString()
    .toLowerCase()
    .trim();

  if (userStatus === "covered" || userStatus === "cover") return true;
  if (
    userStatus === "notcovered" ||
    userStatus === "not_covered" ||
    userStatus === "not cover"
  ) {
    return false;
  }

  if (
    userObj?.isCovered === true ||
    userObj?.iscovered === true ||
    userObj?.covered === true
  ) {
    return true;
  }
  if (
    userObj?.isCovered === false ||
    userObj?.iscovered === false ||
    userObj?.covered === false
  ) {
    return false;
  }

  // 2. Metadata properties
  const meta = metadataObj || userObj?.metadata;
  if (meta) {
    if (typeof meta === "string") {
      const trimmed = meta.toLowerCase().trim();
      return trimmed === "covered" || trimmed === "cover";
    }
    if (typeof meta === "object") {
      const metaStatus = (
        meta.coverageStatus ||
        meta.covering ||
        meta.coverage ||
        meta.status ||
        ""
      )
        .toString()
        .toLowerCase()
        .trim();

      if (metaStatus === "covered" || metaStatus === "cover") return true;
      if (
        metaStatus === "notcovered" ||
        metaStatus === "not_covered" ||
        metaStatus === "not cover"
      ) {
        return false;
      }

      if (
        meta.isCovered === true ||
        meta.iscovered === true ||
        meta.covered === true
      ) {
        return true;
      }
      if (
        meta.isCovered === false ||
        meta.iscovered === false ||
        meta.covered === false
      ) {
        return false;
      }
    }
  }

  return false;
}

const TABS: {
  key: MapTabKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  activeIcon: React.ComponentProps<typeof Ionicons>["name"];
}[] = [
  { key: "location", label: "Location", icon: "map-outline", activeIcon: "map" },
  { key: "lms", label: "LMS", icon: "school-outline", activeIcon: "school" },
  { key: "taxi", label: "Taxi", icon: "car-outline", activeIcon: "car-sport" },
  { key: "driver", label: "Driver", icon: "speedometer-outline", activeIcon: "speedometer" },
  { key: "meter", label: "Meter", icon: "calculator-outline", activeIcon: "calculator" },
  { key: "payments", label: "Payments", icon: "wallet-outline", activeIcon: "wallet" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MapTabBar({
  activeTab,
  onTabPress,
  userRole,
  metadata,
  userRegion,
  user: propUser,
  isCovered: propIsCovered,
}: MapTabBarProps) {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const storeUser = useAuthStore((s) => s.user);

  const currentUser = propUser || storeUser;
  const currentMetadata = metadata || currentUser?.metadata;

  const role = (userRole || currentUser?.role || "").toString().toLowerCase();
  const isDriver = role === "driver";

  const isSriLankaRegion = useMemo(() => {
    // Check userRegion prop, metadata.region, or metadata.country
    const reg = (
      userRegion ||
      currentUser?.region ||
      currentUser?.country ||
      currentMetadata?.region ||
      currentMetadata?.country ||
      currentMetadata?.location?.country ||
      ""
    ).toString().toLowerCase();

    // If region is unspecified/not provided, default to true or match Sri Lanka
    if (!reg) return true;
    return reg.includes("sri lanka") || reg === "lk" || reg === "srilanka";
  }, [userRegion, currentUser, currentMetadata]);

  const isCovered = useMemo(() => {
    return evaluateCoverage(currentUser, currentMetadata, propIsCovered);
  }, [currentUser, currentMetadata, propIsCovered]);

  const visibleTabs = useMemo(() => {
    return TABS.filter((tab) => {
      // Taxi tab is ONLY shown if user is covered and in Sri Lanka region
      if (tab.key === "taxi") {
        return isCovered && isSriLankaRegion;
      }
      if (tab.key === "driver") {
        return isDriver;
      }
      if (tab.key === "meter") {
        return isDriver;
      }

      return true;
    });
  }, [isDriver, isCovered, isSriLankaRegion]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={styles.tabBar}>
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? "#16A34A" : "#64748B"}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    tabBarContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
      zIndex: 99999,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: "#F1F5F9",
      ...Platform.select({
        ios: {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    tabItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      borderRadius: 18,
      gap: 3,
    },
    tabItemActive: {
      backgroundColor: "#F0FDF4",
    },
    tabLabel: {
      fontSize: 11,
      color: "#64748B",
      fontWeight: "500",
    },
    tabLabelActive: {
      color: "#16A34A",
      fontWeight: "700",
    },
  });
}
