// Register FCM background message handler BEFORE React Native loads.
// This file must be the app's main entry so the handler is wired up
// even when the app is launched from a killed state by a push.
import "./src/utils/notificationBackgroundHandler";
import "expo-router/entry";
