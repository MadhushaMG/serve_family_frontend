// TODO: Menna meka mama fix kara.

import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

const { width, height } = Dimensions.get("window");

export const WALKTHROUGH_SLIDES = [
  {
    id: "1",
    icon: "location",
    title: "Real-Time Location",
    description:
      "See where your family members are in real-time on a private map",
  },
  {
    id: "2",
    icon: "notifications",
    title: "Place Alerts",
    description:
      "Get notified when family arrives or leaves important places like home, work, or school",
  },
  {
    id: "3",
    icon: "car-sport",
    title: "Driving Safety",
    description:
      "Monitor driving behaviour and get crash detection with automatic emergency response",
  },
  {
    id: "4",
    icon: "chatbubbles",
    title: "Stay Connected",
    description:
      "Send messages, share locations, and check in with your family anytime",
  },
  {
    id: "5",
    icon: "alert-circle-outline",
    title: "Emergency SOS",
    description:
      "Protect your loved ones with instant SOS alerts and emergency response coordination",
  },
  {
    id: "6",
    icon: "battery-charging",
    title: "Battery Monitoring",
    description:
      "Keep track of your family's battery levels and get notified when they're low",
  },
  {
    id: "7",
    icon: "location-outline",
    title: "Location History",
    description:
      "Review 30 days of location history to see where your family has been",
  },
];

/**
 * Onboarding carousel: index, scroll sync, CTA animation, navigation.
 */
export function useWalkthrough() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(buttonScale, {
      toValue: 0.96,
      duration: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  const onPressOut = useCallback(() => {
    Animated.spring(buttonScale, {
      toValue: 1,
      tension: 120,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [buttonScale]);

  const handleNext = useCallback(() => {
    if (currentIndex < WALKTHROUGH_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      router.replace("/(auth)/LogInScreen");
    }
  }, [currentIndex, router]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const slideSize = event.nativeEvent.layoutMeasurement.width;
      const index = event.nativeEvent.contentOffset.x / slideSize;
      const roundIndex = Math.round(index);
      if (roundIndex !== currentIndex) {
        setCurrentIndex(roundIndex);
      }
    },
    [currentIndex],
  );

  const isLast = currentIndex === WALKTHROUGH_SLIDES.length - 1;

  const skipToLogin = useCallback(() => {
    router.replace("/(auth)/LogInScreen");
  }, [router]);

  return {
    width,
    height,
    flatListRef,
    currentIndex,
    buttonScale,
    slides: WALKTHROUGH_SLIDES,
    isLast,
    onPressIn,
    onPressOut,
    handleNext,
    onScroll,
    skipToLogin,
  };
}
