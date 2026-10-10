import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from "react-native";
import Svg, { Path, Circle, Defs, Stop, LinearGradient } from "react-native-svg";
import { useTheme } from "../constants/theme";

const { width: SCREEN_W } = Dimensions.get("window");

interface LoadingScreenProps {
  progressAnim: Animated.Value;   
  fadeAnim:     Animated.Value;   
  loadingStatus: string;          
}

export default function LoadingScreen({
  progressAnim,
  fadeAnim,
  loadingStatus,
}: LoadingScreenProps) {
  const t = useTheme();

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatAnim]);

  const widthInterpolated = progressAnim
    ? progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
        extrapolate: "clamp",
      })
    : "0%";

  const bg = t.isDark ? t.colors.background : "#EBF3FD";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar
        barStyle={t.isDark ? "light-content" : "dark-content"}
        backgroundColor={bg}
      />

      <View
        style={[
          styles.bgCircle1,
          {
            backgroundColor: t.isDark
              ? "rgba(26,111,212,0.07)"
              : "rgba(26,111,212,0.08)",
          },
        ]}
      />
      <View
        style={[
          styles.bgCircle2,
          {
            backgroundColor: t.isDark
              ? "rgba(52,168,41,0.06)"
              : "rgba(52,168,41,0.07)",
          },
        ]}
      />

      {/* Animated content fades in (driven by parent's fadeAnim) */}
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>

        {/* Floating SVG logo */}
        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
          <Svg width="110" height="110" viewBox="0 0 90 90">
            <Defs>
              <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#2ecc71" />
                <Stop offset="100%" stopColor="#1565c0" />
              </LinearGradient>
            </Defs>
            <Path
              d="M45 8C31.2 8 20 19.2 20 33C20 50 45 78 45 78C45 78 70 50 70 33C70 19.2 58.8 8 45 8Z"
              fill="url(#grad)"
            />
            <Circle cx="45" cy="33" r="16" fill="white" />
            <Circle cx="38" cy="30" r="3"  fill="#1565c0" />
            <Circle cx="45" cy="33" r="2.5" fill="#2ecc71" />
            <Circle cx="52" cy="30" r="3"  fill="#1565c0" />
          </Svg>
        </Animated.View>

        {/* Brand name */}
        <Text style={styles.brandText}>
          <Text style={[styles.half, { color: t.colors.primary }]}>Serve</Text>
          <Text style={[styles.half, { color: t.colors.accent  }]}>Family</Text>
        </Text>

        {/* Progress bar */}
        <View
          style={[
            styles.barTrack,
            { backgroundColor: t.isDark ? "rgba(255,255,255,0.08)" : "#DDE8F8" },
          ]}
        >
          <Animated.View
            style={[
              styles.barFill,
              {
                width: widthInterpolated,
                backgroundColor: t.colors.primary,
              },
            ]}
          />
        </View>

        {/* Status text */}
        <Text style={[styles.status, { color: t.colors.textTertiary }]}>
          {loadingStatus}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  bgCircle1: {
    position: "absolute",
    width:  SCREEN_W * 0.9,
    height: SCREEN_W * 0.9,
    borderRadius: SCREEN_W * 0.45,
    top:   -SCREEN_W * 0.3,
    right: -SCREEN_W * 0.2,
  },
  bgCircle2: {
    position: "absolute",
    width:  SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    borderRadius: SCREEN_W * 0.35,
    bottom: -SCREEN_W * 0.25,
    left:   -SCREEN_W * 0.15,
  },

  inner: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 40,
  },

  brandText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 24,
    marginBottom: 36,
  },
  half: {
    fontSize: 28,
    fontWeight: "700",
  },

  barTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },

  status: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});