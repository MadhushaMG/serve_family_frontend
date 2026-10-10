import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleService } from "../../Services/Circleservice"; // adjust path as needed

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberRole = "creator" | "admin" | "member";

export interface CircleLocation {
  id: string | number;
  name: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  metadata?: any;
}

export interface RelationshipType {
  id: string | number;
  name: string;
  icon?: string;
}

export interface Member {
  id: string | number;
  name?: string;
  email?: string;
  Membership?: {
    nickname?: string;
    role?: MemberRole;
    locationId?: string | number;
    relationship?: string;
    relationshipId?: string | number;
  };
}

interface ManageMemberModalProps {
  visible: boolean;
  onClose: () => void;
  member: Member | null;
  currentUserRole: MemberRole;
  circleId: string | number | null | undefined;
  locations: CircleLocation[] | null | undefined;
  onSaveSuccess?: () => void;
}

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { label: string; value: MemberRole; icon: string }[] = [
  { label: "Member", value: "member", icon: "👤" },
  { label: "Admin",  value: "admin",  icon: "⚡" },
];

// ─── Light palette ────────────────────────────────────────────────────────────

const L = {
  bg:            "#F5F6FA",
  card:          "#FFFFFF",
  inputBg:       "#F8F9FC",
  chipBg:        "#F1F2F8",
  border:        "#E4E6EF",
  accent:        "#4F359B",
  accentLight:   "#EEEBff",
  creatorBg:     "#FFF8EC",
  creatorBorder: "#F6A623",
  creatorText:   "#B86B00",
  adminBg:       "#EEEAFF",
  adminBorder:   "#7B6FD0",
  adminText:     "#4F359B",
  memberBg:      "#F2F4F8",
  memberBorder:  "#C0C5D8",
  memberText:    "#6B7280",
  chipSelectedBg:     "#EEEAFF",
  chipSelectedBorder: "#4F359B",
  chipSelectedText:   "#4F359B",
  locSelectedBg:     "#F0EDFF",
  locSelectedBorder: "#4F359B",
  locSelectedText:   "#4F359B",
  relSelectedBg:     "#F0EDFF",
  relSelectedBorder: "#4F359B",
  relSelectedText:   "#4F359B",
  textPrimary:   "#1A1A2E",
  textSecondary: "#5A5C72",
  textMuted:     "#9092A8",
  textDisabled:  "#C0C3D4",
  textOnAccent:  "#FFFFFF",
  danger:        "#EF4444",
  dangerBg:      "#FFF1F1",
  dangerBorder:  "#FCA5A5",
  overlay:       "rgba(15, 15, 35, 0.45)",
  skeletonBase:  "#EDEEF5",
  skeletonShine: "#F8F9FC",
};

// ─── Emoji fallback map ───────────────────────────────────────────────────────
// API eken icon field එකක් නෑ නම් name based emoji assign කරනවා

const REL_EMOJI_MAP: Record<string, string> = {
  parent:   "👨‍👧",
  father:   "👨‍👧",
  mother:   "👩‍👧",
  child:    "🧒",
  son:      "👦",
  daughter: "👧",
  sibling:  "👫",
  brother:  "👦",
  sister:   "👧",
  spouse:   "💑",
  wife:     "👩",
  husband:  "👨",
  partner:  "🤝",
  friend:   "😊",
  colleague:"💼",
  coworker: "💼",
  guardian: "🛡️",
  grandparent: "👴",
  grandfather: "👴",
  grandmother: "👵",
  grandchild:  "👶",
  uncle:    "🧑",
  aunt:     "👩",
  cousin:   "🧑‍🤝‍🧑",
  neighbor: "🏘️",
  neighbour:"🏘️",
  caregiver:"🩺",
  nanny:    "👶",
  tutor:    "📚",
  teacher:  "👩‍🏫",
  other:    "🔗",
};

function getRelEmoji(name: string): string {
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(REL_EMOJI_MAP)) {
    if (key.includes(k)) return v;
  }
  return "🔗";
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const RelationshipSkeleton = () => (
  <View style={s.skeletonRow}>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={s.skeletonChip} />
    ))}
  </View>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const ManageMemberModal: React.FC<ManageMemberModalProps> = ({
  visible,
  onClose,
  member,
  currentUserRole,
  circleId,
  locations,
  onSaveSuccess,
}) => {
  const insets = useSafeAreaInsets();

  // ── Permissions ───────────────────────────────────────────────────────────
  const memberRole      = (member?.role ?? "member") as MemberRole;
  const targetIsCreator = memberRole === "creator";

  const canEditRole         = currentUserRole === "creator" && !targetIsCreator;
  const canEditNickname     = currentUserRole === "creator" || currentUserRole === "admin";
  const canEditLocation     = currentUserRole === "creator" || currentUserRole === "admin";
  const canEditRelationship = currentUserRole === "creator" || currentUserRole === "admin";

  // ── Local state ───────────────────────────────────────────────────────────
  const [editedRole, setEditedRole]                 = useState<MemberRole>("member");
  const [editedNickname, setEditedNickname]         = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | number | null>(null);
  const [saving, setSaving]                         = useState(false);
  const [error, setError]                           = useState<string | null>(null);

  // Relationship
  const [relationshipTypes, setRelationshipTypes]     = useState<RelationshipType[]>([]);
  const [relLoading, setRelLoading]                   = useState(false);
  const [relError, setRelError]                       = useState<string | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
  // Track the original so we know whether to call remove or update
  const [originalRelationship, setOriginalRelationship] = useState<string | null>(null);

  // ── Sync state when member changes ───────────────────────────────────────
  useEffect(() => {
    if (member) {
      setEditedRole((member.role as MemberRole) ?? "member");
      setEditedNickname(member.Membership?.nickname ?? "");
      setSelectedLocationId(member.Membership?.locationId ?? null);
      const rel = member.Membership?.relationship ?? null;
      setSelectedRelationship(rel);
      setOriginalRelationship(rel);
      setError(null);
    }
  }, [member]);

  // ── Fetch relationship types when modal opens ─────────────────────────────
  const fetchRelationshipTypes = useCallback(async () => {
    setRelLoading(true);
    setRelError(null);
    try {
      const res = await CircleService.GET_RELATIONSHIPS_TYPE();
      // API response shape: array or { data: array }
      const raw = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setRelationshipTypes(raw);
    } catch {
      setRelError("Could not load relationship types.");
    } finally {
      setRelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchRelationshipTypes();
  }, [visible, fetchRelationshipTypes]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!member || !circleId) return;
    setSaving(true);
    setError(null);

    try {
      const memberId         = member.id;
      const originalRole     = (member.role ?? "member") as MemberRole;
      const originalNickname = member.Membership?.nickname ?? "";
      const promises: Promise<any>[] = [];

      // Role
      if (canEditRole && editedRole !== originalRole)
        promises.push(CircleService.ChangeMemberRole(circleId, memberId, editedRole));

      // Nickname
      if (canEditNickname && editedNickname !== originalNickname)
        promises.push(CircleService.ChangeMemberNickname(circleId, memberId, editedNickname));

      // Relationship
      if (canEditRelationship && selectedRelationship !== originalRelationship) {
        if (selectedRelationship === null && originalRelationship !== null) {
          // User cleared the relationship → remove it
          promises.push(CircleService.RemovememberRelationship(circleId, memberId));
        } else if (selectedRelationship !== null) {
          // New or changed relationship → update
          promises.push(CircleService.ChangeMemberRelationship(circleId, memberId, selectedRelationship));
        }
      }

      // Location (uncomment when endpoint ready):
      // const originalLocationId = member.Membership?.locationId ?? null;
      // if (canEditLocation && selectedLocationId !== originalLocationId)
      //   promises.push(CircleService.AssignMemberLocation(circleId, memberId, selectedLocationId));

      await Promise.all(promises);
      onSaveSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const displayName =
    member?.Membership?.nickname || member?.name || member?.email || "Unnamed member";

  const safeLocations: CircleLocation[] = Array.isArray(locations) ? locations : [];

  const roleMeta =
    memberRole === "creator"
      ? { bg: L.creatorBg, border: L.creatorBorder, text: L.creatorText, label: "Creator", icon: "👑" }
      : memberRole === "admin"
      ? { bg: L.adminBg,   border: L.adminBorder,   text: L.adminText,   label: "Admin",   icon: "⚡" }
      : { bg: L.memberBg,  border: L.memberBorder,  text: L.memberText,  label: "Member",  icon: "👤" };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          style={{ width: "100%" }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[s.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={s.handle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Header ── */}
            <View style={s.headerRow}>
              <View style={s.avatarWrap}>
                <Text style={s.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.nameText} numberOfLines={1}>{displayName}</Text>
                <View style={s.badgeRow}>
                  <View style={[s.rolePill, { backgroundColor: roleMeta.bg, borderColor: roleMeta.border }]}>
                    <Text style={s.rolePillIcon}>{roleMeta.icon}</Text>
                    <Text style={[s.rolePillText, { color: roleMeta.text }]}>{roleMeta.label}</Text>
                  </View>
                  {selectedRelationship && (
                    <View style={s.relBadge}>
                      <Text style={s.relBadgeText}>
                        {getRelEmoji(selectedRelationship)} {selectedRelationship}
                      </Text>
                    </View>
                  )}
                  {targetIsCreator && (
                    <View style={s.protectedPill}>
                      <Text style={s.protectedText}>🔒 Protected</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.divider} />

            {/* ── Role ── */}
            <View style={s.section}>
              <View style={s.labelRow}>
                <Text style={s.sectionLabel}>ROLE</Text>
              </View>

              <View style={s.chipRow}>
                {ROLE_OPTIONS.map((opt) => {
                  const isSelected = editedRole === opt.value;
                  const isDisabled = !canEditRole;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.chip, isSelected && s.chipSelected, isDisabled && s.chipDisabled]}
                      onPress={() => { if (!isDisabled) setEditedRole(opt.value); }}
                      activeOpacity={isDisabled ? 1 : 0.7}
                      disabled={isDisabled}
                    >
                      <Text style={[s.chipIcon, isDisabled && { opacity: 0.4 }]}>{opt.icon}</Text>
                      <Text style={[
                        s.chipText,
                        isSelected && !isDisabled && s.chipTextSelected,
                        isDisabled && s.chipTextDisabled,
                      ]}>
                        {opt.label}
                      </Text>
                      {isSelected && !isDisabled && (
                        <View style={s.chipCheck}><Text style={s.chipCheckText}>✓</Text></View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {canEditRole && (
                <Text style={s.helperText}>
                  Admins can manage nicknames & locations but cannot change roles.
                </Text>
              )}
            </View>

            {/* ── Nickname ── */}
            <View style={s.section}>
              <View style={s.labelRow}>
                <Text style={s.sectionLabel}>NICKNAME</Text>
                {!canEditNickname && (
                  <View style={s.lockRow}>
                    <Text style={s.lockIcon}>🔒</Text>
                    <Text style={s.lockText}>No permission</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[s.input, !canEditNickname && s.inputDisabled]}
                value={editedNickname}
                onChangeText={setEditedNickname}
                editable={canEditNickname}
                placeholder="Enter nickname…"
                placeholderTextColor={L.textDisabled}
                selectionColor={L.accent}
              />
            </View>

            {/* ── Relationship ── */}
            <View style={s.section}>
              <View style={s.labelRow}>
                <View style={s.labelWithCount}>
                  <Text style={s.sectionLabel}>RELATIONSHIP</Text>
                  {!relLoading && relationshipTypes.length > 0 && (
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{relationshipTypes.length}</Text>
                    </View>
                  )}
                </View>
                <View style={s.lockRow}>
                  {!canEditRelationship ? (
                    <>
                      <Text style={s.lockIcon}>🔒</Text>
                      <Text style={s.lockText}>No permission</Text>
                    </>
                  ) : selectedRelationship ? (
                    <TouchableOpacity
                      onPress={() => setSelectedRelationship(null)}
                      style={s.clearRelBtn}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={s.clearRelBtnText}>Clear ✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {relLoading ? (
                <RelationshipSkeleton />
              ) : relError ? (
                <View style={s.relErrorBox}>
                  <Text style={s.relErrorText}>{relError}</Text>
                  <TouchableOpacity onPress={fetchRelationshipTypes} style={s.retryBtn}>
                    <Text style={s.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : relationshipTypes.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>🔗</Text>
                  <Text style={s.emptyText}>No relationship types available.</Text>
                </View>
              ) : (
                <View style={s.relGrid}>
                  {relationshipTypes.map((rel) => {
                    const isSelected  = selectedRelationship === rel.name;
                    const isDisabled  = !canEditRelationship;
                    const emoji       = rel.icon ?? getRelEmoji(rel.name);
                    return (
                      <TouchableOpacity
                        key={rel.id}
                        style={[
                          s.relChip,
                          isSelected && s.relChipSelected,
                          isDisabled && s.chipDisabled,
                        ]}
                        onPress={() => {
                          if (!isDisabled) {
                            // Toggle off if same selected
                            setSelectedRelationship(isSelected ? null : rel.name);
                          }
                        }}
                        activeOpacity={isDisabled ? 1 : 0.7}
                        disabled={isDisabled}
                      >
                        <Text style={s.relChipEmoji}>{emoji}</Text>
                        <Text style={[
                          s.relChipText,
                          isSelected && s.relChipTextSelected,
                          isDisabled && s.chipTextDisabled,
                        ]}>
                          {rel.name}
                        </Text>
                        {isSelected && (
                          <View style={s.relChipCheck}>
                            <Text style={s.relChipCheckText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Special Place ── */}
            <View style={s.section}>
              <View style={s.labelRow}>
                <Text style={s.sectionLabel}>SPECIAL PLACE</Text>
                {!canEditLocation && (
                  <View style={s.lockRow}>
                    <Text style={s.lockIcon}>🔒</Text>
                    <Text style={s.lockText}>No permission</Text>
                  </View>
                )}
              </View>

              {safeLocations.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyIcon}>📍</Text>
                  <Text style={s.emptyText}>No locations added to this circle yet.</Text>
                </View>
              ) : (
                <View style={s.locationGrid}>
                  <TouchableOpacity
                    style={[s.locationChip, selectedLocationId === null && s.locationChipSelected, !canEditLocation && s.chipDisabled]}
                    onPress={() => { if (canEditLocation) setSelectedLocationId(null); }}
                    activeOpacity={canEditLocation ? 0.7 : 1}
                    disabled={!canEditLocation}
                  >
                    <Text style={[s.locationChipText, selectedLocationId === null && s.locationChipTextSelected, !canEditLocation && s.chipTextDisabled]}>
                      None
                    </Text>
                  </TouchableOpacity>

                  {safeLocations.map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[s.locationChip, isSelected && s.locationChipSelected, !canEditLocation && s.chipDisabled]}
                        onPress={() => { if (canEditLocation) setSelectedLocationId(loc.id); }}
                        activeOpacity={canEditLocation ? 0.7 : 1}
                        disabled={!canEditLocation}
                      >
                        <Text style={[s.locationChipText, isSelected && s.locationChipTextSelected, !canEditLocation && s.chipTextDisabled]} numberOfLines={1}>
                          📍 {loc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Error ── */}
            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️  {error}</Text>
              </View>
            ) : null}

            {/* ── Buttons ── */}
            <View style={s.buttonsRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose} disabled={saving} activeOpacity={0.7}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator size="small" color={L.textOnAccent} />
                  : <Text style={s.saveBtnText}>Save changes</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: L.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: L.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDE0EC",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: L.accentLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: L.accent,
  },
  avatarLetter: { fontSize: 20, fontWeight: "700", color: L.accent },
  nameText: { fontSize: 17, fontWeight: "700", color: L.textPrimary },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  rolePillIcon: { fontSize: 10 },
  rolePillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" },
  relBadge: {
    backgroundColor: "#F0EDFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C4B8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  relBadgeText: { fontSize: 11, color: "#4F359B", fontWeight: "600" },
  protectedPill: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  protectedText: { fontSize: 11, color: "#92400E", fontWeight: "600" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: L.chipBg, borderWidth: 1, borderColor: L.border,
    alignItems: "center", justifyContent: "center",
  },
  closeBtnText: { fontSize: 13, color: L.textSecondary, fontWeight: "600" },

  divider: { height: 1, backgroundColor: L.border, marginBottom: 20 },

  // Sections
  section: { marginBottom: 22 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  labelWithCount: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: L.textMuted, letterSpacing: 0.9 },
  countBadge: {
    backgroundColor: L.chipSelectedBg,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: L.chipSelectedBorder,
  },
  countBadgeText: { fontSize: 10, fontWeight: "700", color: L.accent },
  lockRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  lockIcon: { fontSize: 10 },
  lockText: { fontSize: 11, color: L.textDisabled, fontStyle: "italic" },
  helperText: { fontSize: 12, color: L.textMuted, marginTop: 8, lineHeight: 17 },

  // Role chips
  chipRow: { flexDirection: "row", gap: 10 },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: L.chipBg,
    borderWidth: 1.5,
    borderColor: L.border,
    gap: 6,
  },
  chipSelected: { backgroundColor: L.chipSelectedBg, borderColor: L.chipSelectedBorder },
  chipDisabled: { opacity: 0.38 },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 14, fontWeight: "600", color: L.textSecondary },
  chipTextSelected: { color: L.chipSelectedText },
  chipTextDisabled: { color: L.textDisabled },
  chipCheck: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: L.accent,
    alignItems: "center", justifyContent: "center",
  },
  chipCheckText: { fontSize: 10, color: L.textOnAccent, fontWeight: "700" },

  // Input
  input: {
    backgroundColor: L.inputBg,
    borderWidth: 1.5,
    borderColor: L.border,
    borderRadius: 14,
    color: L.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputDisabled: { opacity: 0.45 },

  // Relationship
  relGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: L.chipBg,
    borderWidth: 1.5,
    borderColor: L.border,
  },
  relChipSelected: {
    backgroundColor: L.relSelectedBg,
    borderColor: L.relSelectedBorder,
  },
  relChipEmoji: { fontSize: 14 },
  relChipText: { fontSize: 13, fontWeight: "500", color: L.textSecondary },
  relChipTextSelected: { color: L.relSelectedText, fontWeight: "700" },
  relChipCheck: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: L.accent,
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  relChipCheckText: { fontSize: 9, color: L.textOnAccent, fontWeight: "700" },
  clearRelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "#FFF1F1",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  clearRelBtnText: { fontSize: 11, color: L.danger, fontWeight: "600" },

  // Skeleton
  skeletonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skeletonChip: {
    width: 90,
    height: 38,
    borderRadius: 12,
    backgroundColor: L.skeletonBase,
  },

  // Relationship error
  relErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: L.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: L.dangerBorder,
  },
  relErrorText: { color: L.danger, fontSize: 13, flex: 1 },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: L.danger,
    marginLeft: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Locations
  locationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  locationChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: L.chipBg,
    borderWidth: 1.5,
    borderColor: L.border,
  },
  locationChipSelected: { backgroundColor: L.locSelectedBg, borderColor: L.locSelectedBorder },
  locationChipText: { color: L.textSecondary, fontSize: 13, fontWeight: "500" },
  locationChipTextSelected: { color: L.locSelectedText, fontWeight: "700" },

  // Empty state
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: L.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: L.border,
  },
  emptyIcon: { fontSize: 16 },
  emptyText: { color: L.textMuted, fontSize: 13 },

  // Save error
  errorBox: {
    backgroundColor: L.dangerBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: L.dangerBorder,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: L.danger, fontSize: 13, lineHeight: 19 },

  // Buttons
  buttonsRow: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: L.bg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: L.border,
  },
  cancelBtnText: { color: L.textSecondary, fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: L.accent,
    alignItems: "center",
    shadowColor: L.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: L.textOnAccent, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});