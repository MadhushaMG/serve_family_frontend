import { useTheme } from "../constants/theme";
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  Stop,
  LinearGradient,
} from "react-native-svg";

const { width: SCREEN_W } = Dimensions.get("window");

interface SplashScreenProps {
  onAnimationFinish: () => void;
}

export default function ServeFamilySplash({
  onAnimationFinish,
}: SplashScreenProps) {
  const t = useTheme();

  // ── Animation values ──────────────────────────────────────────────────────
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(18)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;
  const dot1        = useRef(new Animated.Value(0.25)).current;
  const dot2        = useRef(new Animated.Value(0.25)).current;
  const dot3        = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();


    Animated.sequence([
      Animated.delay(650),
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();


    Animated.sequence([
      Animated.delay(500),
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
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
      ),
    ]).start();


    const dotWave = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.25,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(460),
        ])
      );

    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        dotWave(dot1, 0),
        dotWave(dot2, 160),
        dotWave(dot3, 320),
      ]),
    ]).start();

    const timer = setTimeout(onAnimationFinish, 3600);
    return () => clearTimeout(timer);
  }, [
    onAnimationFinish,
    dot1,
    dot2,
    dot3,
    floatAnim,
    logoOpacity,
    logoScale,
    tagOpacity,
    textOpacity,
    textSlide,
  ]);

  const styles = makeStyles(t);

  return (
    <View style={styles.container}>

      {/* ── Background decorative circles ─────────────────────────────────── */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* ── Logo ──────────────────────────────────────────────────────────── */}
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Image
          source={require("../assets/logo/logo-pin.png")}
          style={{ width: 110, height: 110 }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* ── Brand text ────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.textGroup,
          {
            opacity: textOpacity,
            transform: [{ translateY: textSlide }],
          },
        ]}
      >
        <Text style={styles.brandText}>
          <Text style={styles.serveText}>Serve</Text>
          <Text style={styles.familyText}>Family</Text>
        </Text>
      </Animated.View>

      {/* ── Tagline ───────────────────────────────────────────────────────── */}
      <Animated.View style={{ opacity: tagOpacity }}>
        <Text style={styles.tagline}>Stay Connected · Stay Protected</Text>
      </Animated.View>

      {/* ── Dot wave loader ───────────────────────────────────────────────── */}
      <View style={styles.loaderContainer}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dot, transform: [{ scale: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles (theme-aware) ────────────────────────────────────────────────────
function makeStyles(t: ReturnType<typeof useTheme>) {
  const bg = t.isDark ? t.colors.background : "#EBF3FD"; 

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
      alignItems: "center",
      justifyContent: "center",
    },

    // Soft decorative circles for depth
    bgCircle1: {
      position: "absolute",
      width: SCREEN_W * 0.9,
      height: SCREEN_W * 0.9,
      borderRadius: SCREEN_W * 0.45,
      backgroundColor: t.isDark
        ? "rgba(26,111,212,0.07)"
        : "rgba(26,111,212,0.08)",
      top: -SCREEN_W * 0.3,
      right: -SCREEN_W * 0.2,
    },
    bgCircle2: {
      position: "absolute",
      width: SCREEN_W * 0.7,
      height: SCREEN_W * 0.7,
      borderRadius: SCREEN_W * 0.35,
      backgroundColor: t.isDark
        ? "rgba(52,168,41,0.06)"
        : "rgba(52,168,41,0.07)",
      bottom: -SCREEN_W * 0.25,
      left: -SCREEN_W * 0.15,
    },

    // Glow behind logo
    glowRing: {
      position: "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: t.isDark
        ? "rgba(41,121,232,0.18)"
        : "rgba(26,111,212,0.12)",
      alignSelf: "center",
    },

    logoWrap: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[2],
    },

    textGroup: {
      alignItems: "center",
      marginTop: t.space[5],
    },

    brandText: {
      fontSize: t.typography.size["3xl"],   // 28sp
      fontWeight: t.typography.weight.bold,
      letterSpacing: t.typography.tracking.tight,
      lineHeight: t.typography.size["3xl"] * 1.2,
    },
    serveText: {
      color: t.colors.primary,              
    },
    familyText: {
      color: t.colors.accent,              
    },

    tagline: {
      color: t.colors.textTertiary,
      fontSize: t.typography.size.xs,      
      fontWeight: t.typography.weight.medium,
      letterSpacing: t.typography.tracking.widest,  
      textTransform: "uppercase",
      marginTop: t.space[2],
    },

    loaderContainer: {
      position: "absolute",
      bottom: 60,
      flexDirection: "row",
      gap: t.space[2],                      
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: t.colors.primary,
    },
  });
}