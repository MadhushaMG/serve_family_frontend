import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import {
  Edge,
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";

type ModalSafeAreaProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
};

/**
 * Full-screen RN Modals render outside the app SafeAreaProvider tree, so a plain
 * SafeAreaView often gets 0 top inset on iOS (status bar / Dynamic Island overlap).
 * Wrapping with SafeAreaProvider + initialWindowMetrics restores correct insets.
 */
export default function ModalSafeArea({
  children,
  style,
  edges = ["top", "bottom"],
}: ModalSafeAreaProps) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>
      <SafeAreaView style={[{ flex: 1 }, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
