import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTaxiMeterStore, formatTime } from "../store/useTaxiMeterStore";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const WIDGET_WIDTH = 220;
const WIDGET_HEIGHT = 74;

export default function FloatingTaxiMeterWidget() {
  const {
    status,
    liveFare,
    distanceMeters,
    elapsedSeconds,
    isOverlayActive,
    setOverlayActive,
    setModalVisible,
  } = useTaxiMeterStore();

  // Position Animation
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - WIDGET_WIDTH - 16, y: 120 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only set pan responder if movement is more than 5px to allow taps
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Don't render if not active or status is idle/stopped
  if (!isOverlayActive || status === "idle" || status === "stopped") {
    return null;
  }

  const handleOpenMeterModal = () => {
    setModalVisible(true);
  };

  const handleCloseOverlay = () => {
    // Only close the overlay view, meter continues running in background
    setOverlayActive(false);
  };

  const isRunning = status === "running";

  return (
    <Animated.View
      style={[
        styles.widgetContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenMeterModal}
        style={styles.innerCard}
      >
        {/* Top Header */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.dot, isRunning ? styles.dotGreen : styles.dotYellow]} />
            <Text style={styles.headerText}>TAXI METER ({status.toUpperCase()})</Text>
          </View>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleCloseOverlay}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Content Row */}
        <View style={styles.contentRow}>
          <View style={styles.fareBox}>
            <Text style={styles.currency}>LKR</Text>
            <Text style={styles.fareText}>{liveFare.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoCol}>
            <Text style={styles.infoValue}>{(distanceMeters / 1000).toFixed(2)} km</Text>
            <Text style={styles.infoLabel}>{formatTime(elapsedSeconds)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  widgetContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    zIndex: 99999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  innerCard: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#22C55E",
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: {
    backgroundColor: "#22C55E",
  },
  dotYellow: {
    backgroundColor: "#EAB308",
  },
  headerText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 2,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fareBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  currency: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  fareText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#22C55E",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: "#334155",
  },
  infoCol: {
    alignItems: "flex-end",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  infoLabel: {
    fontSize: 9,
    color: "#94A3B8",
  },
});
