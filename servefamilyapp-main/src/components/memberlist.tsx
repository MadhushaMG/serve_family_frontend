import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Member, RoleKey } from "./types";
import useTheme from "../constants/theme";

// ================================================================
//                          CONSTANTS
// ================================================================

const AVATAR_COLORS = [
  { bg: "#EEEDFE", text: "#3C3489" },
  { bg: "#E1F5EE", text: "#085041" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#FAECE7", text: "#712B13" },
  { bg: "#E6F1FB", text: "#0C447C" },
];

// ================================================================
//                       HELPER FUNCTIONS
// ================================================================

const normalizeRole = (role?: string): RoleKey => {
  const r = role?.toLowerCase();
  if (r === "admin" || r === "moderator" || r === "creator" || r === "member")
    return r;
  return "member";
};

const getInitials = (name = ""): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name = "") =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const batteryColor = (pct: number): string => {
  if (pct >= 60) return "#639922";
  if (pct >= 25) return "#BA7517";
  return "#E24B4A";
};

const getRoleBadge = (role: RoleKey) => {
  const map: Record<
    RoleKey,
    {
      label: string;
      icon: React.ComponentProps<typeof Ionicons>["name"];
      bg: string;
      text: string;
    }
  > = {
    creator: {
      label: "Creator",
      icon: "ribbon-outline",
      bg: "#534AB7",
      text: "#EEEDFE",
    },
    moderator: {
      label: "Creator",
      icon: "ribbon-outline",
      bg: "#534AB7",
      text: "#EEEDFE",
    },
    admin: {
      label: "Admin",
      icon: "shield-outline",
      bg: "#EEEDFE",
      text: "#3C3489",
    },
    member: {
      label: "Member",
      icon: "person-outline",
      bg: "#E1F5EE",
      text: "#085041",
    },
  };
  return map[role];
};

const isCreatorRole = (role: RoleKey): boolean =>
  role === "moderator" || role === "creator";

// ================================================================
//                        MEMBER AVATAR
// ================================================================

interface MemberAvatarProps {
  member: Member;
  isCreator: boolean;
}

const MemberAvatar: React.FC<MemberAvatarProps> = ({ member, isCreator }) => {
  const [imgFailed, setImgFailed] = useState(false);

  const displayName = member.name || "?";
  const initials = getInitials(displayName);
  const clr = getAvatarColor(displayName);
  const hasImage = !!member.avatar && !imgFailed;

  return (
    <View style={styles.avatarWrap}>
      {hasImage ? (
        <Image
          source={{ uri: `https://api.servefamily.com${member.avatar as string}` }}
          style={styles.avatarImg}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.avatarImg,
            {
              backgroundColor: clr.bg,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: clr.text }}>
            {initials}
          </Text>
        </View>
      )}

      {isCreator && (
        <View style={styles.creatorDot}>
          <Text style={styles.creatorDotTxt}>Creator</Text>
        </View>
      )}
    </View>
  );
};

// ================================================================
//                         MEMBER ROW
// ================================================================

interface MemberRowProps {
  member: Member;
  allowEdit: boolean;
  allowRemove: boolean;
  isRemoving: boolean;
  creatorId?: string | number;
  onEdit: (member: Member) => void;
  onRemove: (member: Member) => void;
  onFocusMap: (memberId: string | number) => void;
}

const MemberRowComponent: React.FC<MemberRowProps> = ({
  member,
  allowEdit,
  allowRemove,
  isRemoving,
  creatorId,
  onEdit,
  onRemove,
  onFocusMap,
}) => {
  const [expanded, setExpanded] = useState(false);
  const t = useTheme();
  const displayName = member.name || "Unknown Member";
  const rawRole = member.id === creatorId ? "creator" : member.role;
  const memberRole = normalizeRole(rawRole);
  const badge = getRoleBadge(memberRole);
  const isCreator = isCreatorRole(memberRole);
  const battPct = parseFloat(String(member?.battery ?? "0").replace("%", ""));
  const battClr = batteryColor(battPct);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setExpanded((v) => !v)}
      style={[styles.row, { backgroundColor: t.colors.surface, borderColor: t.colors.border }]}
    >
      <MemberAvatar member={member} isCreator={isCreator} />

      <View style={styles.info}>
        <Text style={[styles.memberName, { color: t.colors.textPrimary }]} numberOfLines={1}>
          {displayName}
        </Text>

        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Ionicons name={badge.icon} size={10} color={badge.text} />
          <Text style={[styles.badgeTxt, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>

        {expanded && (
          <>
            <View style={styles.expandedGrid}>
              <View style={[styles.detailCard, { backgroundColor: t.colors.primaryDark }]}>
                <Text style={[styles.detailVal, { color: t.colors.textOnPrimary }]}>{member.status ?? "Unknown"}</Text>
                <Text style={[styles.detailLbl, { color: t.colors.textOnPrimary }]}>Status</Text>
              </View>
              <View style={[styles.detailCard, { backgroundColor: t.colors.primaryDark }]}>
                <Text style={[styles.detailVal, { color: t.colors.textOnPrimary }]}>{member.lastSeenText ?? "—"}</Text>
                <Text style={[styles.detailLbl, { color: t.colors.textOnPrimary }]}>Last seen</Text>
              </View>
            </View>

            {/* ── Focus on Map button ── */}
            <TouchableOpacity
              style={styles.focusMapBtn}
              activeOpacity={0.75}
              onPress={(e) => {
                e.stopPropagation();           // row toggle ekata prevent karanna
                if (member.id !== undefined) {
                  onFocusMap(member.id);
                }
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
          <Text style={styles.speedTxt}>{member.speed ?? 0} km/h</Text>
        </View>
      </View>

      {(allowEdit || allowRemove) && (
        <View style={styles.actions}>
          {allowEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, allowRemove && { marginBottom: 6 }]}
              onPress={() => onEdit(member)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color="#185FA5" />
            </TouchableOpacity>
          )}

          {allowRemove && !isCreator && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onRemove(member)}
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
};

const MemberRow = React.memo(MemberRowComponent);
MemberRow.displayName = "MemberRow";

// ================================================================
//                        MEMBERS PANEL
// ================================================================

interface MembersPanelProps {
  members?: Member[];
  circleName?: string;
  creatorId?: string | number;
  currentUserId?: string | number;
  currentUserRole?: RoleKey;
  allowEdit?: boolean;
  allowRemove?: boolean;
  isRemoving?: boolean;
  onInvite?: () => void;
  onEditMember: (member: Member) => void;
  onRemoveMember: (member: Member) => void;
  /** Called with the member's id when "Focus on Map" is pressed inside the expanded row */
  onFocusMap: (memberId: string | number) => void;
}

const MembersPanel: React.FC<MembersPanelProps> = ({
  members = [],
  circleName = "Circle",
  creatorId,
  currentUserId,
  allowEdit = true,
  allowRemove = true,
  isRemoving = false,
  onInvite,
  onEditMember,
  onRemoveMember,
  onFocusMap,
}) => {
  const t = useTheme();
  const currentUserIsCreator =
    currentUserId !== undefined && currentUserId === creatorId;

  // Render as plain views — nested FlashList/FlatList inside BottomSheetScrollView
  // steals gestures and often gets zero height, which blocks sheet scrolling.
  const userMembers = useMemo(
    () => members.filter((member) => member.type === "user"),
    [members],
  );

  return (
    <View style={[styles.panel, { borderColor: t.colors.border }]}>
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: "#EEEDFE" }]}>
          <Ionicons name="people-outline" size={18} color="#3C3489" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.panelTitle, { color: t.colors.textPrimary }]}>Members</Text>
          <Text style={[styles.panelSub, { color: t.colors.textSecondary }]}>
            {circleName}
          </Text>
        </View>

        {onInvite && (
          <TouchableOpacity style={styles.inviteBtn} onPress={onInvite}>
            <Text style={styles.inviteTxt}>+ Invite</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionLabel}>
        {userMembers.length} member
        {userMembers.length !== 1 ? "s" : ""}
      </Text>

      <View style={styles.memberList}>
        {userMembers.map((item) => {
          const targetIsCreator = item.id !== undefined && item.id === creatorId;
          const isSelf = item.id !== undefined && item.id === currentUserId;
          const canEdit =
            allowEdit && (isSelf || currentUserIsCreator || !targetIsCreator);
          const canRemove =
            allowRemove && !isSelf && (currentUserIsCreator || !targetIsCreator);
          const key = item.id?.toString() ?? `${item.name}-${item.role}`;

          return (
            <MemberRow
              key={key}
              member={item}
              allowEdit={canEdit}
              allowRemove={canRemove}
              isRemoving={isRemoving}
              creatorId={creatorId}
              onEdit={onEditMember}
              onRemove={onRemoveMember}
              onFocusMap={onFocusMap}
            />
          );
        })}
      </View>
    </View>
  );
};

export default MembersPanel;

// ================================================================
//                           STYLES
// ================================================================

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
  panelTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111111",
  },
  panelSub: {
    fontSize: 12,
    color: "#999999",
  },
  inviteBtn: {
    backgroundColor: "#EEEDFE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inviteTxt: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3C3489",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#999999",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  memberList: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 10,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  creatorDot: {
    position: "absolute",
    bottom: -3,
    right: -4,
    backgroundColor: "#534AB7",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  creatorDotTxt: {
    fontSize: 8,
    fontWeight: "500",
    color: "#EEEDFE",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
  },
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
  badgeTxt: {
    fontSize: 11,
    fontWeight: "500",
  },
  nickname: {
    fontSize: 11,
    color: "#999999",
    marginTop: 2,
  },
  expandedGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  detailCard: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 8,
  },
  detailVal: {
    fontSize: 10,
    fontWeight: "500",
    color: "#111111",
  },
  detailLbl: {
    fontSize: 11,
    color: "#999999",
    marginTop: 2,
  },
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
  stats: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  battRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  battPct: {
    fontSize: 11,
    color: "#999999",
  },
  battWrap: {
    width: 34,
    height: 13,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.2)",
    borderRadius: 3,
    padding: 2,
    overflow: "hidden",
  },
  battFill: {
    height: "100%",
    borderRadius: 1,
  },
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
  speedTxt: {
    fontSize: 11,
    fontWeight: "500",
    color: "#666666",
  },
  actions: {
    gap: 5,
    flexShrink: 0,
  },
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
});