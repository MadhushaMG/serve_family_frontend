// FIXME: mekath oneda kiyala shuwar naha 

import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";

import { UserLocation } from "../types/models";
import { storeLastKnownLocation } from "../utils/locationCache";

// Stub — replace with your actual implementation
const processCircleLocationUpdate = async (
  _circleId: string,
  _coords: any,
) => {};

/**
 * useLocationWatcher
 *
 * Manages foreground GPS subscription and keyboard height tracking.
 */
export function useLocationWatcher(
  activeCircleIdRef: React.MutableRefObject<string | null>,
) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const locationRef = useRef<UserLocation | null>(null);
  const locationWatchSubscriptionRef =
    useRef<Location.LocationSubscription | null>(null);

  // Persist latest location to ref & cache
  useEffect(() => {
    locationRef.current = location;
    if (!location) return;
    void storeLastKnownLocation({
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }, [location]);

  // Foreground GPS watcher
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (status !== "granted") return;

        try {
          locationWatchSubscriptionRef.current?.remove();
        } catch {}

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3500,
          },
          (position) => {
            if (cancelled || !position?.coords) return;

            const next: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading ?? undefined,
              accuracy: Number.isFinite(position.coords.accuracy)
                ? (position.coords.accuracy ?? null)
                : null,
            };

            if (activeCircleIdRef.current) {
              void processCircleLocationUpdate(activeCircleIdRef.current, {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy ?? null,
                speed: position.coords.speed ?? null,
              });
            }

            setLocation(next);
            locationRef.current = next;
          },
        );

        if (cancelled) {
          sub.remove();
        } else {
          locationWatchSubscriptionRef.current = sub;
        }
      } catch (err) {
        if (!cancelled) console.warn("Failed to start location watcher", err);
      }
    };

    void start();

    return () => {
      cancelled = true;
      try {
        locationWatchSubscriptionRef.current?.remove();
      } catch {}
      locationWatchSubscriptionRef.current = null;
    };
  }, [activeCircleIdRef]);

  // Keyboard height
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: any) =>
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    const onHide = () => setKeyboardHeight(0);

    const s = Keyboard.addListener(showEvent, onShow);
    const h = Keyboard.addListener(hideEvent, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  return { location, setLocation, locationRef, keyboardHeight };
}