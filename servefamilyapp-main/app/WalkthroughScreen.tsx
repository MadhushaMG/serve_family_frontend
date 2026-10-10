import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Redirect } from "expo-router";

import { useTheme } from "../src/constants/theme";
import { useWalkthrough } from "@/src/hooks/useWalkthrough";
import { useAuthHydration, useAuthStore } from "@/src/store/authStore";

const BACKGROUND_VIDEO = require("../src/assets/backgroundvideo/bg-v1.mp4");

export default function WalkthroughScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hasHydrated = useAuthHydration();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  const {
    flatListRef,
    currentIndex,
    buttonScale,
    slides,
    isLast,
    onPressIn,
    onPressOut,
    handleNext,
    onScroll,
    skipToLogin,
  } = useWalkthrough();

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

  type Slide = (typeof slides)[number];

  const bottomBlockHeight = hp(1) + hp(7) + hp(3) + insets.bottom + hp(4);

  const renderItem = ({ item }: { item: Slide }) => (
    <View
      style={{
        width,
        height,
        justifyContent: "flex-end",
        paddingHorizontal: t.space[6],
      }}
    >
      <View style={{ paddingBottom: bottomBlockHeight }}>
        <View
          style={[
            styles.iconBadge,
            {
              width: wp(16),
              height: wp(16),
              borderRadius: t.radius.full,
              marginBottom: t.space[5],
            },
          ]}
        >
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={wp(7)}
            color="#fff"
          />
        </View>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              fontSize: t.typography.size["3xl"],
              fontWeight: t.typography.weight.bold,
              color: "#fff",
              textAlign: "center",
              marginBottom: t.space[3],
              letterSpacing: t.typography.tracking.tight,
              textShadowColor: "rgba(0,0,0,0.8)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 12,
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: t.typography.size.md,
              color: "rgba(255,255,255,0.88)",
              textAlign: "center",
              lineHeight: t.typography.size.md * t.typography.leading.normal,
              fontWeight: t.typography.weight.regular,
              maxWidth: "88%",
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            {item.description}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <Video
        source={BACKGROUND_VIDEO}
        style={styles.bgVideo}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.05)",
          "rgba(0,0,0,0.25)",
          "rgba(13,18,32,0.82)",
          "rgba(13,18,32,0.97)",
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <LinearGradient
        colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.81)", "rgba(0, 0, 0, 0.84)"]}
        locations={[0, 0.4, 1]}
        style={[
          StyleSheet.absoluteFillObject,
          { top: undefined, height: bottomBlockHeight + hp(35) },
        ]}
        pointerEvents="none"
      />

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        style={styles.slideList}
        // Lets FlatList correctly re-measure pages on rotation instead of
        // caching the width it was first mounted with.
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: t.space[6],
          paddingBottom: Math.max(insets.bottom, t.space[6]) + hp(1.5),
          alignItems: "center",
          gap: t.space[5],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: t.space[2],
          }}
        >
          {slides.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <View
                key={index}
                style={{
                  height: 6,
                  width: isActive ? 28 : 6,
                  borderRadius: t.radius.full,
                  backgroundColor: isActive
                    ? t.colors.primary
                    : "rgba(255,255,255,0.4)",
                }}
              />
            );
          })}
        </View>

        <Animated.View
          style={{ width: "100%", transform: [{ scale: buttonScale }] }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={handleNext}
            style={{
              height: hp(7),
              minHeight: 52,
              borderRadius: t.radius.full,
              backgroundColor: isLast ? t.colors.accent : t.colors.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: t.space[2],
              ...t.shadows.lg,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: t.typography.size.md,
                fontWeight: t.typography.weight.semibold,
                letterSpacing: t.typography.tracking.wide,
              }}
            >
              {isLast ? "Get Started" : "Next"}
            </Text>
            <Ionicons
              name={isLast ? "checkmark" : "chevron-forward"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>

        {!isLast && (
          <TouchableOpacity
            onPress={skipToLogin}
            hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: t.typography.size.sm,
                fontWeight: t.typography.weight.medium,
                letterSpacing: t.typography.tracking.wide,
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bgVideo: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  slideList: {
    flex: 1,
    backgroundColor: "transparent",
  },
  iconBadge: {
    alignSelf: "center",
    backgroundColor: "rgba(26,111,212,0.25)",
    borderWidth: 1.5,
    borderColor: "rgba(26,111,212,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
