import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  ListRenderItemInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SavedPlace } from "./types";

// ─── Place icon helper ────────────────────────────────────────────────

const placeIconConfig = (type?: SavedPlace["type"]) => {
  switch (type) {
    case "home":   return { bg: "#DCFCE7", border: "#86EFAC", color: "#3B6D11", icon: "home-outline"   as const };
    case "office": return { bg: "#E6F1FB", border: "#93C5FD", color: "#0C447C", icon: "business-outline" as const };
    default:       return { bg: "#F5F5F5", border: "rgba(0,0,0,0.1)", color: "#666666", icon: "location-outline" as const };
  }
};

// ─── PlaceRow ─────────────────────────────────────────────────────────

interface PlaceRowProps {
  place: SavedPlace;
  isDeleting: boolean;
  canEdit: boolean;
  onEdit: (place: SavedPlace) => void;
  onDelete: (place: SavedPlace) => void;
  onFocus: (place: SavedPlace) => void;
}

const PlaceRow: React.FC<PlaceRowProps> = React.memo(({
  place, isDeleting, canEdit, onEdit, onDelete, onFocus,
}) => {
  const [expanded, setExpanded] = useState(false);

  const cfg = placeIconConfig(place.type);
  const coordLabel = `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setExpanded(v => !v)}
      style={styles.row}
    >
      <View style={[styles.placeIcon, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>

      <View style={styles.info}>
        <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
        <Text style={styles.placeCoords}>{coordLabel}</Text>

        {place.isAssigned && (
          <View style={styles.assignedBadge}>
            <Ionicons name="star-outline" size={10} color="#3C3489" />
            <Text style={styles.assignedTxt}>Assigned to you</Text>
          </View>
        )}

        {expanded && (
          <View style={styles.expandedGrid}>
            <View style={styles.detailCard}>
              <Text style={styles.detailVal}>{place.area ?? "—"}</Text>
              <Text style={styles.detailLbl}>Area</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailVal}>Active</Text>
              <Text style={styles.detailLbl}>Status</Text>
            </View>
          </View>
        )}

        {expanded && (
          <TouchableOpacity style={styles.focusBtn} onPress={() => onFocus(place)}>
            <Ionicons name="navigate-outline" size={12} color="#185FA5" />
            <Text style={styles.focusTxt}>Focus on map</Text>
          </TouchableOpacity>
        )}
      </View>

      {canEdit && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { marginBottom: 6 }]}
            onPress={() => onEdit(place)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={18} color="#185FA5" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(place)}
            disabled={isDeleting}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#A32D2D" />
              : <Ionicons name="trash-outline" size={18} color="#A32D2D" />}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});

PlaceRow.displayName = "PlaceRow";

// ─── PlacesPanel ──────────────────────────────────────────────────────

interface PlacesPanelProps {
  places?: SavedPlace[];
  isDeleting?: boolean;
  canManage?: boolean;
  onAddPlace: () => void;
  onEditPlace: (place: SavedPlace) => void;
  onDeletePlace: (place: SavedPlace) => void;
  onFocusPlace: (place: SavedPlace) => void;
}

const PlacesPanel: React.FC<PlacesPanelProps> = ({
  places = [],
  isDeleting = false,
  canManage = true,
  onAddPlace,
  onEditPlace,
  onDeletePlace,
  onFocusPlace,
}) => {
  const renderPlace = useCallback(
    ({ item }: ListRenderItemInfo<SavedPlace>) => (
      <PlaceRow
        place={item}
        isDeleting={isDeleting}
        canEdit={canManage}
        onEdit={onEditPlace}
        onDelete={onDeletePlace}
        onFocus={onFocusPlace}
      />
    ),
    [isDeleting, canManage, onEditPlace, onDeletePlace, onFocusPlace],
  );

  return (
    <View style={styles.panel}>
      {/* Header */}
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: "#DCFCE7" }]}>
          <Ionicons name="map-outline" size={18} color="#3B6D11" />
        </View>
        <View>
          <Text style={styles.panelTitle}>Places</Text>
          <Text style={styles.panelSub}>Saved locations</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>
        {places.length} saved place{places.length !== 1 ? "s" : ""}
      </Text>

    <TouchableOpacity style={styles.addRow} onPress={onAddPlace} activeOpacity={0.7}>
        <View style={[styles.placeIcon, { backgroundColor: "#DCFCE7", borderColor: "rgba(0,0,0,0.1)" }]}>
          <Ionicons name="add" size={20} color="#3B6D11" />
        </View>
        <View>
          <Text style={styles.addLabel}>Add a place</Text>
          <Text style={styles.addSub}>Save home, office, etc.</Text>
        </View>
      </TouchableOpacity>

      <FlatList<SavedPlace>
        data={places}
        keyExtractor={p => p.id.toString()}
        renderItem={renderPlace}
        contentContainerStyle={{ gap: 8 }}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyTxt}>No saved places yet.</Text>
        }
      />
    </View>
  );
};

export default PlacesPanel;

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
    overflow: "hidden",
    marginBottom: 16,
    padding: 12,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  panelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTitle: { fontSize: 15, fontWeight: "500", color: "#111111" },
  panelSub:   { fontSize: 12, color: "#999999" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#999999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  placeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info:       { flex: 1, minWidth: 0 },
  placeName:  { fontSize: 14, fontWeight: "500", color: "#111111" },
  placeCoords: { fontSize: 11, color: "#999999", marginTop: 2 },
  assignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    backgroundColor: "#EEEDFE",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  assignedTxt:  { fontSize: 11, fontWeight: "500", color: "#3C3489" },
  expandedGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  detailCard:   { flex: 1, backgroundColor: "#F5F5F5", borderRadius: 8, padding: 8 },
  detailVal:    { fontSize: 14, fontWeight: "500", color: "#111111" },
  detailLbl:    { fontSize: 11, color: "#999999", marginTop: 2 },
  focusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#E6F1FB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  focusTxt: { fontSize: 11, fontWeight: "500", color: "#185FA5" },
  actions:   { gap: 5, flexShrink: 0 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 0.5,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 10,
    marginVertical: 20,
  },
  addLabel: { fontSize: 14, fontWeight: "500", color: "#111111" },
  addSub:   { fontSize: 11, color: "#999999", marginTop: 1 },
  emptyTxt: { fontSize: 13, color: "#999999", marginBottom: 8 },
});