import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity,} from "react-native";
import Mapbox from "@rnmapbox/maps";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

// ─────────────────────────── shared types ───────────────────────────

interface EntityMarkerBase {
  coordinate: [number, number];
  name: string;
  id: string;
  lastSeen?: string;
  activeMarkerId: string | null;
  onMarkerPress: (id: string | null) => void;
  cameraRef: React.RefObject<Mapbox.Camera>;
}

// ─────────────────────────── helpers ────────────────────────────────

const COLORS = {
  gpsBg: "#1A56DB",       
  gpsBorder: "#1E40AF",
  petBg: "#D97706",      
  petBorder: "#92400E",
  itemBg: "#7C3AED",      
  itemBorder: "#4C1D95",
  calloutBg: "#FFFFFF",
  calloutShadow: "#00000033",
  textDark: "#1A1A1A",
  textMid: "#6B7280",
  white: "#FFFFFF",
};


function formatLastSeen(iso?: string): string {
  if (!iso) return "Unknown";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}



interface CalloutProps {
  name: string;
  lastSeen?: string;
  accentColor: string;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onDismiss: () => void;
}

const EntityCallout: React.FC<CalloutProps> = ({
  name,
  lastSeen,
  accentColor,
  iconName,
  onDismiss,
}) => (
  <View style={calloutStyles.wrapper}>
    {/* Bubble */}
    <View style={calloutStyles.bubble}>
      <View style={[calloutStyles.iconBox, { backgroundColor: accentColor }]}>
        <MaterialCommunityIcons name={iconName} size={16} color="#fff" />
      </View>
      <View style={calloutStyles.textBlock}>
        <Text style={calloutStyles.nameText} numberOfLines={1}>
          {name}
        </Text>
        <Text style={calloutStyles.seenText}>
          Last seen: {formatLastSeen(lastSeen)}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color={COLORS.textMid} />
      </TouchableOpacity>
    </View>
    {/* Triangle tail */}
    <View style={calloutStyles.tail} />
  </View>
);

const calloutStyles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.calloutBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    maxWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  nameText: { fontSize: 13, fontWeight: "700", color: COLORS.textDark },
  seenText: { fontSize: 11, color: COLORS.textMid, marginTop: 1 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.calloutBg,
    marginTop: -1,
  },
});

// ═══════════════════════════════════════════════════════════════════
//  GPS DEVICE MARKER
// ═══════════════════════════════════════════════════════════════════

export interface GpsDeviceMarkerProps extends EntityMarkerBase {
  /** Battery percentage 0–100 */
  battery?: number;
  /** Signal strength label e.g. "Good" | "Weak" | "No Signal" */
  signal?: string;
}

export const GpsDeviceMarker: React.FC<GpsDeviceMarkerProps> = ({
  coordinate,
  name,
  id,
  lastSeen,
  battery,
  signal,
  activeMarkerId,
  onMarkerPress,
  cameraRef,
}) => {
  const isActive = activeMarkerId === id;

  const handlePress = useCallback(() => {
    if (isActive) {
      onMarkerPress(null);
      return;
    }
    onMarkerPress(id);
    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 15,
      animationDuration: 600,
    });
  }, [isActive, id, coordinate, onMarkerPress, cameraRef]);

  const batteryIcon =
    battery == null
      ? "battery-unknown"
      : battery > 60
      ? "battery-high"
      : battery > 20
      ? "battery-medium"
      : "battery-low";

  return (
    <Mapbox.MarkerView
      id={id}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      allowOverlap
    >
      <View style={gpsStyles.root}>
        {/* Callout */}
        {isActive && (
          <EntityCallout
            name={name}
            lastSeen={lastSeen}
            accentColor={COLORS.gpsBg}
            iconName="router-wireless"
            onDismiss={() => onMarkerPress(null)}
          />
        )}

        {/* Pin body */}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[gpsStyles.pin, isActive && gpsStyles.pinActive]}
        >
          {/* Device icon */}
          <MaterialCommunityIcons name="router-wireless" size={20} color="#fff" />

          {/* Battery chip */}
          {battery != null && (
            <View style={gpsStyles.batteryChip}>
              <MaterialCommunityIcons name={batteryIcon as any} size={9} color={COLORS.gpsBg} />
              <Text style={gpsStyles.batteryText}>{battery}%</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Drop shadow nub */}
        <View style={gpsStyles.nub} />
        <View style={gpsStyles.shadow} />
      </View>
    </Mapbox.MarkerView>
  );
};

const gpsStyles = StyleSheet.create({
  root: { alignItems: "center" },
  pin: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.gpsBg,
    borderWidth: 2.5,
    borderColor: COLORS.gpsBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.gpsBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
  pinActive: {
    transform: [{ scale: 1.12 }],
    shadowOpacity: 0.7,
  },
  batteryChip: {
    position: "absolute",
    bottom: -6,
    right: -6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 3,
  },
  batteryText: { fontSize: 8, fontWeight: "700", color: COLORS.gpsBg },
  nub: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.gpsBg,
    transform: [{ rotate: "45deg" }],
    marginTop: -5,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.gpsBorder,
  },
  shadow: {
    width: 14,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
});

// ═══════════════════════════════════════════════════════════════════
//  PET MARKER
// ═══════════════════════════════════════════════════════════════════

export interface PetMarkerProps extends EntityMarkerBase {
  /** "dog" | "cat" | "bird" | "rabbit" | "other" */
  petKind?: "dog" | "cat" | "bird" | "rabbit" | "other";
}

const PET_ICON_MAP: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  dog: "dog",
  cat: "cat",
  bird: "bird",
  rabbit: "rabbit",
  other: "paw",
};

export const PetMarker: React.FC<PetMarkerProps> = ({
  coordinate,
  name,
  id,
  lastSeen,
  petKind = "other",
  activeMarkerId,
  onMarkerPress,
  cameraRef,
}) => {
  const isActive = activeMarkerId === id;
  const icon = PET_ICON_MAP[petKind] ?? "paw";

  const handlePress = useCallback(() => {
    if (isActive) { onMarkerPress(null); return; }
    onMarkerPress(id);
    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 15,
      animationDuration: 600,
    });
  }, [isActive, id, coordinate, onMarkerPress, cameraRef]);

  return (
    <Mapbox.MarkerView
      id={id}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      allowOverlap
    >
      <View style={petStyles.root}>
        {isActive && (
          <EntityCallout
            name={name}
            lastSeen={lastSeen}
            accentColor={COLORS.petBg}
            iconName="paw"
            onDismiss={() => onMarkerPress(null)}
          />
        )}

        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[petStyles.pin, isActive && petStyles.pinActive]}
        >
          {/* Outer paw ring */}
          <View style={petStyles.ring}>
            <MaterialCommunityIcons name={icon} size={22} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={petStyles.nub} />
        <View style={petStyles.shadow} />
      </View>
    </Mapbox.MarkerView>
  );
};

const petStyles = StyleSheet.create({
  root: { alignItems: "center" },
  pin: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.petBg,
    borderWidth: 3,
    borderColor: COLORS.petBorder,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.petBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pinActive: {
    transform: [{ scale: 1.12 }],
    shadowOpacity: 0.75,
  },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  nub: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.petBg,
    transform: [{ rotate: "45deg" }],
    marginTop: -5,
    borderBottomRightRadius: 2,
  },
  shadow: {
    width: 16,
    height: 5,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
});

// ═══════════════════════════════════════════════════════════════════
//  ITEM MARKER  (key, bag, wallet, etc.)
// ═══════════════════════════════════════════════════════════════════

export interface ItemMarkerProps extends EntityMarkerBase {
  /** "key" | "bag" | "wallet" | "laptop" | "other" */
  itemKind?: "key" | "bag" | "wallet" | "laptop" | "other";
}

const ITEM_ICON_MAP: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  key: "key-variant",
  bag: "bag-personal",
  wallet: "wallet",
  laptop: "laptop",
  other: "tag",
};

export const ItemMarker: React.FC<ItemMarkerProps> = ({
  coordinate,
  name,
  id,
  lastSeen,
  itemKind = "other",
  activeMarkerId,
  onMarkerPress,
  cameraRef,
}) => {
  const isActive = activeMarkerId === id;
  const icon = ITEM_ICON_MAP[itemKind] ?? "tag";

  const handlePress = useCallback(() => {
    if (isActive) { onMarkerPress(null); return; }
    onMarkerPress(id);
    cameraRef.current?.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 15,
      animationDuration: 600,
    });
  }, [isActive, id, coordinate, onMarkerPress, cameraRef]);

  return (
    <Mapbox.MarkerView
      id={id}
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      allowOverlap
    >
      <View style={itemStyles.root}>
        {isActive && (
          <EntityCallout
            name={name}
            lastSeen={lastSeen}
            accentColor={COLORS.itemBg}
            iconName={icon}
            onDismiss={() => onMarkerPress(null)}
          />
        )}

        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.85}
          style={[itemStyles.pin, isActive && itemStyles.pinActive]}
        >
          {/* Diamond shape using rotation trick */}
          <View style={itemStyles.diamond}>
            <MaterialCommunityIcons name={icon} size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={itemStyles.nub} />
        <View style={itemStyles.shadow} />
      </View>
    </Mapbox.MarkerView>
  );
};

const itemStyles = StyleSheet.create({
  root: { alignItems: "center" },
  pin: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.itemBg,
    borderWidth: 2.5,
    borderColor: COLORS.itemBorder,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    shadowColor: COLORS.itemBg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pinActive: {
    shadowOpacity: 0.8,
  },
  diamond: {
    // counter-rotate the icon so it stays upright
    transform: [{ rotate: "-45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  nub: {
    width: 10,
    height: 10,
    backgroundColor: COLORS.itemBg,
    transform: [{ rotate: "45deg" }],
    marginTop: -5,
    borderBottomRightRadius: 2,
  },
  shadow: {
    width: 14,
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginTop: 2,
  },
});