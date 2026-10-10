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
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { TrackedEntity } from "./types";
import useTheme from "../constants/theme";

// ======================== HELPERS ========================

const batteryColor = (pct: number): string => {
  if (pct >= 60) return "#639922";
  if (pct >= 25) return "#BA7517";
  return "#E24B4A";
};

// ======================== ENTITY ROW ========================

interface EntityRowProps {
  entity: TrackedEntity;
  allowEdit: boolean;
  allowRemove: boolean;
  isRemoving: boolean;
  onEdit: (entity: TrackedEntity) => void;
  onRemove: (entity: TrackedEntity) => void;
  /** Called with the entity's id when "Focus on Map" is pressed */
  onFocusMap: (entityId: string | number) => void;
}

const EntityRow: React.FC<EntityRowProps> = React.memo(
  ({ entity, allowEdit, allowRemove, isRemoving, onEdit, onRemove, onFocusMap }) => {
    const [expanded, setExpanded] = useState(false);

    const battPct = entity.batteryLevel ?? 0;
    const battClr = batteryColor(battPct);
    const isPet = entity.relationship === "pet";

    const iconColor = isPet ? "#F59E0B" : "#8B5CF6";
    const iconBg = isPet ? "#FEF3C7" : "#EDE9FE";
    const iconBorder = isPet ? "#F59E0B" : "#8B5CF6";
    const badgeBg = isPet ? "#FEF3C7" : "#EDE9FE";
    const badgeTxt = isPet ? "#633806" : "#4C1D95";

    const isOnline = entity.status === "Online";
    const t = useTheme();
    const statusLabel = isOnline ? "Online" : (entity.status ?? "Unknown");

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((v) => !v)}
        style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
      >
        <View
          style={[
            styles.entityIcon,
            { backgroundColor: iconBg, borderColor: iconBorder },
          ]}
        >
          {isPet ? (
            <FontAwesome5 name="paw" size={18} color={iconColor} />
          ) : (
            <Ionicons name="cube-outline" size={18} color={iconColor} />
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.entityName, { color: t.colors.textPrimary }]} numberOfLines={1}>
            {entity.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Ionicons
              name={isOnline ? "checkmark-circle-outline" : "time-outline"}
              size={10}
              color={badgeTxt}
            />
            <Text style={[styles.badgeTxt, { color: badgeTxt }]}>
              {statusLabel}
            </Text>
          </View>

          {expanded && (
            <>
              <View style={styles.expandedGrid}>
                <View style={[styles.detailCard, { backgroundColor: t.colors.primaryDark }]}>
                  <Text style={[styles.detailVal, { color: t.colors.textOnPrimary }]}>
                    {entity.status ?? "Unknown"}
                  </Text>
                  <Text style={[styles.detailLbl, { color: t.colors.textOnPrimary }]}>Status</Text>
                </View>
                <View style={[styles.detailCard, { backgroundColor: t.colors.primaryDark }]}>
                  <Text style={[styles.detailVal, { color: t.colors.textOnPrimary }]}>{entity.lastSeen ?? "—"}</Text>
                  <Text style={[styles.detailLbl, { color: t.colors.textOnPrimary }]}>Last seen</Text>
                </View>
              </View>

              {/* ── Focus on Map button ── */}
              <TouchableOpacity
                style={styles.focusMapBtn}
                activeOpacity={0.75}
                onPress={(e) => {
                  e.stopPropagation(); // row toggle ekata prevent karanna
                  onFocusMap(entity.id);
                }}
              >
                <Ionicons name="navigate-outline" size={13} color="#0C447C" />
                <Text style={styles.focusMapTxt}>Focus on Map</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.battRow}>
            <Text style={styles.battPct}>{battPct}%</Text>
            <View style={[styles.battWrap, { borderColor: t.colors.border }]}>
              <View
                style={[
                  styles.battFill,
                  {
                    width: `${Math.min(battPct, 100)}%` as any,
                    backgroundColor: battClr,
                  },
                ]}
              />
            </View>
            <View style={[styles.battTip, { borderColor: t.colors.border }]} />
          </View>
          <View style={styles.speedPill}>
            <Text style={styles.speedTxt}>{entity.speedKmph ?? 0} km/h</Text>
          </View>
        </View>

        {(allowEdit || allowRemove) && (
          <View style={styles.actions}>
            {allowEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, allowRemove && { marginBottom: 6 }]}
                onPress={() => onEdit(entity)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={18} color="#185FA5" />
              </TouchableOpacity>
            )}
            {allowRemove && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onRemove(entity)}
                disabled={isRemoving}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isRemoving ? (
                  <ActivityIndicator size="small" color="#A32D2D" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#A32D2D" />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

EntityRow.displayName = "EntityRow";

// ======================== ADD ROW ========================

const AddRow: React.FC<{
  label: string;
  subLabel: string;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
}> = ({ label, subLabel, iconBg, iconColor, onPress }) => {
  const t = useTheme();
  return (
    <TouchableOpacity style={styles.addRow} onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.entityIcon,
          { backgroundColor: iconBg, borderColor: t.colors.border },
        ]}
      >
        <Ionicons name="add" size={20} color={iconColor} />
      </View>
      <View>
        <Text style={[styles.addLabel, { color: t.colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.addSub, { color: t.colors.textSecondary }]}>{subLabel}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ======================== PETS AND ITEMS PANEL ========================

interface PetsAndItemsPanelProps {
  entities?: TrackedEntity[];
  allowEdit?: boolean;
  allowRemove?: boolean;
  isRemoving?: boolean;
  onAddPet: () => void;
  onAddItem: () => void;
  onEditEntity: (entity: TrackedEntity) => void;
  onRemoveEntity: (entity: TrackedEntity) => void;
  /** Called with the entity's id when "Focus on Map" is pressed */
  onFocusMap: (entityId: string | number) => void;
  onItemsSectionLayout?: (y: number) => void;
}

const PetsAndItemsPanel: React.FC<PetsAndItemsPanelProps> = ({
  entities = [],
  allowEdit = true,
  allowRemove = true,
  isRemoving = false,
  onAddPet,
  onAddItem,
  onEditEntity,
  onRemoveEntity,
  onFocusMap,
  onItemsSectionLayout,
}) => {
  const pets = entities.filter((e) => e.type === "entity" && e.relationship === "pet");
  const items = entities.filter((e) => e.type === "entity" && e.relationship !== "pet");
  const t = useTheme();

  const renderEntity = useCallback(
    ({ item }: ListRenderItemInfo<TrackedEntity>) => (
      <EntityRow
        entity={item}
        allowEdit={allowEdit}
        allowRemove={allowRemove}
        isRemoving={isRemoving}
        onEdit={onEditEntity}
        onRemove={onRemoveEntity}
        onFocusMap={onFocusMap}
      />
    ),
    [allowEdit, allowRemove, isRemoving, onEditEntity, onRemoveEntity, onFocusMap],
  );

  return (
    <View style={[styles.panel, { borderColor: t.colors.border }]}>
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: "#FDE68A" }]}>
          <FontAwesome5 name="paw" size={16} color="#633806" />
        </View>
        <View>
          <Text style={[styles.panelTitle, { color: t.colors.textPrimary }]}>Pets & Items</Text>
          <Text style={[styles.panelSub, { color: t.colors.textSecondary }]}>Tracked devices</Text>
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: t.colors.textSecondary }]}>Pets</Text>
      <View style={styles.list}>
        <AddRow
          label="Add a pet"
          subLabel="Track your pet's location"
          iconBg="#FEF3C7"
          iconColor="#F59E0B"
          onPress={onAddPet}
        />
        <FlatList<TrackedEntity>
          data={pets}
          keyExtractor={(e) => e.id.toString()}
          renderItem={renderEntity}
          contentContainerStyle={{ gap: 8 }}
          scrollEnabled={false}
          ListEmptyComponent={
            <Text style={[styles.emptyTxt, { color: t.colors.textSecondary }]}>No pets added yet.</Text>
          }
        />
      </View>

      <View style={styles.divider} />

      {/* Items section — exposes its Y offset via onItemsSectionLayout */}
      <View onLayout={(e) => onItemsSectionLayout?.(e.nativeEvent.layout.y)}>
        <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Items</Text>
        <View style={styles.list}>
          <AddRow
            label="Add an item"
            subLabel="Attach a tracker to items"
            iconBg="#EDE9FE"
            iconColor="#8B5CF6"
            onPress={onAddItem}
          />
          <FlatList<TrackedEntity>
            data={items}
            keyExtractor={(e) => e.id.toString()}
            renderItem={renderEntity}
            contentContainerStyle={{ gap: 8 }}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyTxt, { color: t.colors.textSecondary }]}>No items added yet.</Text>
            }
          />
        </View>
      </View>
    </View>
  );
};

export default PetsAndItemsPanel;

// ======================== STYLES ========================

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    borderWidth: 0.5,
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
  panelSub: { fontSize: 12, color: "#999999" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#999999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  list: { gap: 8 },
  divider: {
    height: 0.5,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 12,
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
  entityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  entityName: { fontSize: 14, fontWeight: "500", color: "#111111" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  badgeTxt: { fontSize: 11, fontWeight: "500" },
  expandedGrid: { flexDirection: "row", gap: 6, marginTop: 8 },
  detailCard: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
  },
  detailVal: { fontSize: 10, fontWeight: "500", color: "#111111" },
  detailLbl: { fontSize: 11, color: "#999999", marginTop: 2 },
  // ── NEW: Focus on Map button ──────────────────────────────────
  focusMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#E6F1FB",
    borderWidth: 0.5,
    borderColor: "#B3CDE8",
  },
  focusMapTxt: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0C447C",
  },
  // ─────────────────────────────────────────────────────────────
  stats: { alignItems: "flex-end", gap: 6, flexShrink: 0 },
  battRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  battPct: { fontSize: 11, color: "#999999" },
  battWrap: {
    width: 34,
    height: 13,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    padding: 2,
    overflow: "hidden",
  },
  battFill: { height: "100%", borderRadius: 1 },
  battTip: {
    width: 3,
    height: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  speedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "#F5F5F5",
  },
  speedTxt: { fontSize: 11, fontWeight: "500", color: "#666666" },
  actions: { gap: 5, flexShrink: 0 },
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
    marginTop: 4,
  },
  addLabel: { fontSize: 14, fontWeight: "500", color: "#111111" },
  addSub: { fontSize: 11, color: "#999999", marginTop: 1 },
  emptyTxt: { fontSize: 13, color: "#999999", marginBottom: 8 },
});