

import * as Location from 'expo-location';

const BACKGROUND_FETCH_TASK = 'background-location-task';

export function useBackgroundTracker() {

    const startBackgroundTracking = async () => {
        try {
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

            if (fgStatus !== 'granted' || bgStatus !== 'granted') return;

            const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_FETCH_TASK);
            if (!hasStarted) {
                await Location.startLocationUpdatesAsync(BACKGROUND_FETCH_TASK, {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 15000,
                    distanceInterval: 10,
                    deferredUpdatesTimeout: 15000,
                    showsBackgroundLocationIndicator: true,
                    pausesUpdatesAutomatically: false,
                    foregroundService: {

                        notificationTitle: "ServeFamily Active",
                        notificationBody: "Monitoring location in background.",
                        notificationColor: "#7B6EF6"
                    }
                });
                console.log('🟢 Background tracking started successfully!');
            }
        } catch (err) {
            console.log("Error starting background tracking:", err);
        }
    };

    const stopBackgroundTracking = async () => {
        try {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_FETCH_TASK);
            if (hasStarted) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_FETCH_TASK);
                console.log('🔴 Background tracking stopped successfully.');
            }
        } catch (err) {
            console.log("Error stopping background tracking:", err);
        }
    };

    return { startBackgroundTracking, stopBackgroundTracking };
}