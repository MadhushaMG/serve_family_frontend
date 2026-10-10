import React, {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import BottomSheet, {
  useBottomSheetSpringConfigs,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import type { SharedValue } from "react-native-reanimated";
import { useTheme } from "@/src/constants/theme";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PillCounts {
  members: number;
  pets: number;
  items: number;
  place: number;
}

export interface MapBottomSheetProps {
  activeSection: string;
  onSectionPress: (key: string) => void;
  pillCounts: PillCounts;
  animatedPosition?: SharedValue<number>;
  onScroll?: (event: any) => void;
  children: React.ReactNode;
}

export interface MapBottomSheetRef {
  snapToIndex: (index: number) => void;
  scrollToY: (y: number) => void;
}

const TAB_BAR_HEIGHT = hp("7%");
const MAX_SHEET_HEIGHT_PERCENT = 70;

function getSnapPoints(
  insetBottom: number,
  screenHeightPx: number,
): [string, string, string] {
  const isSmallPhone = screenHeightPx < 700;
  const isMediumPhone = screenHeightPx >= 700 && screenHeightPx < 844;

  const minPercent = isSmallPhone ? "32%" : "28%";
  const midPercent = isSmallPhone ? "50%" : isMediumPhone ? "48%" : "45%";

  return [minPercent, midPercent, `${MAX_SHEET_HEIGHT_PERCENT}%`];
}

type SheetStyles = ReturnType<typeof createStyles>;

const SheetDragHandle = memo(function SheetDragHandle({
  styles,
}: {
  styles: SheetStyles;
}) {
  return (
    <View style={styles.dragContainer} collapsable={false}>
      <View style={styles.dragHitArea}>
        <View style={styles.pill} />
        {Platform.OS === "ios" ? (
          <Text style={styles.hint}>Drag to expand</Text>
        ) : null}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const MapBottomSheet = forwardRef<MapBottomSheetRef, MapBottomSheetProps>(
  ({ animatedPosition, children }, ref) => {
    const t = useTheme();
    const styles = useMemo(() => createStyles(t), [t]);
    const insets = useSafeAreaInsets();

    const bottomSheetRef = useRef<BottomSheet>(null);
    const currentSnapIndex = useRef(1);

    const animationConfigs = useBottomSheetSpringConfigs({
      damping: Platform.OS === "ios" ? 28 : 80,
      stiffness: Platform.OS === "ios" ? 260 : 500,
      mass: 0.8,
      overshootClamping: true,
    });

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) =>
        bottomSheetRef.current?.snapToIndex(index),
      // Content scrolling is owned by the screen's BottomSheetScrollView.
      scrollToY: () => {},
    }));

    const snapPoints = useMemo(
      () => getSnapPoints(insets.bottom, hp("100%")),
      [insets.bottom],
    );

    const renderHandle = useCallback(
      () => <SheetDragHandle styles={styles} />,
      [styles],
    );

    const handleAnimate = useCallback((_fromIndex: number, toIndex: number) => {
      if (toIndex < 0) {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(0));
      } else if (toIndex > 2) {
        requestAnimationFrame(() => bottomSheetRef.current?.snapToIndex(2));
      }
    }, []);

    const handleChange = useCallback((index: number) => {
      if (index < 0) {
        bottomSheetRef.current?.snapToIndex(0);
        return;
      }
      if (index > 2) {
        bottomSheetRef.current?.snapToIndex(2);
        return;
      }
      currentSnapIndex.current = index;
    }, []);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBg}
        handleComponent={renderHandle}
        enablePanDownToClose={false}
        enableOverDrag
        enableDynamicSizing={false}
        style={styles.sheet}
        animatedPosition={animatedPosition}
        animationConfigs={animationConfigs}
        // BottomSheetScrollView must be a direct child so it receives the sheet
        // height. Content pans scroll first; sheet moves at scroll top / handle.
        enableContentPanningGesture
        enableHandlePanningGesture
        animateOnMount={false}
        overDragResistanceFactor={Platform.OS === "ios" ? 8 : 6}
        activeOffsetY={Platform.OS === "ios" ? [-12, 12] : [-8, 8]}
        failOffsetX={Platform.OS === "ios" ? [-18, 18] : undefined}
        onAnimate={handleAnimate}
        onChange={handleChange}
      >
        {children}
      </BottomSheet>
    );
  },
);

MapBottomSheet.displayName = "MapBottomSheet";
export default MapBottomSheet;

// ─────────────────────────────────────────────────────────────────────────────
// Styles — theme-driven, dark/light automatic, sized with hp/wp
// ─────────────────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    sheet: {
      zIndex: 9999,
    },
    sheetBg: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: "#F1F5F9",
      ...Platform.select({
        ios: {
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    sheetBody: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    dragContainer: {
      alignItems: "center",
      justifyContent: "center",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: "#FFFFFF",
    },
    // Larger touch target so iOS drag gestures activate reliably.
    dragHitArea: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: Platform.OS === "ios" ? 44 : 36,
      paddingTop: t.space[3],
      paddingBottom: t.space[2],
      paddingHorizontal: t.space[8],
      alignSelf: "stretch",
    },
    pill: {
      width: wp("12%"),
      height: 5,
      borderRadius: 3,
      backgroundColor: "#2563EB",
    },
    hint: {
      fontSize: t.typography.size.xs,
      color: "#64748B",
      marginTop: 4,
      letterSpacing: 0.3,
      fontWeight: "500",
    },

    stickyHeaderContainer: {
      backgroundColor: "#FFFFFF",
      paddingBottom: t.space[2],
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    stickyHeaderPillsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: t.space[3],
      paddingVertical: 10,
      gap: t.space[2],
    },
    stickyHeaderPill: {
      flex: 1,
      minWidth: wp("20%"),
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[2],
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      backgroundColor: "#FFFFFF",
    },
    stickyHeaderIconWrap: {
      width: hp("3%"),
      height: hp("3%"),
      borderRadius: t.radius.full,
      backgroundColor: "#EFF6FF",
      alignItems: "center",
      justifyContent: "center",
    },
    stickyHeaderPillLabel: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.medium,
      color: "#334155",
    },
    stickyHeaderBadge: {
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      backgroundColor: "#16A34A",
    },
    stickyHeaderBadgeText: {
      fontSize: 9,
      fontWeight: t.typography.weight.bold,
      color: "#FFFFFF",
    },
    stickyHeaderDivider: { height: 0 },

    sheetContent: {
      paddingHorizontal: t.space[4],
      paddingTop: t.space[2],
      backgroundColor: "#FFFFFF",
    },
  });
}
