/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ModalSafeArea from "@/src/components/ModalSafeArea";
import {
  AlertCircle,
  BatteryLow,
  Bell,
  Car,
  CheckCircle2,
  LocateFixed,
  LocateOff,
  LogOut,
  MapPin,
  MapPinOff,
  MapPinPlus,
  ShieldCheck,
  Tag,
  UserMinus,
  UserPlus,
  X,
  XCircle,
} from "lucide-react-native";

import { useTheme } from "@/src/constants/theme";
import { NotificationItem, NotificationType } from "@/src/types/Alltypes";
import {
  useGetNotifications,
  useMarkAllAsRead,
  useMarkAsRead,
} from "@/src/hooks/Usenotification";

// ─── Filter chips (matches the pill row in the mock) ──────────────────────────

type FilterKey =
  | "circle"
  | "status"
  | "battery"
  | "sos"
  | "group"
  | "tips"
  | "offer";

const FILTER_GROUPS: {
  key: FilterKey;
  label: string;
  types: NotificationType[] | "all";
}[] = [
  { key: "circle", label: "Circle", types: "all" },
  {
    key: "status",
    label: "Status",
    types: [
      NotificationType.LOCATION_REACHED,
      NotificationType.LOCATION_LEFT,
      NotificationType.LOCATION_ADDED,
      NotificationType.LOCATION_REMOVED,
      NotificationType.LOCATION_ASSIGNED,
      NotificationType.LOCATION_UNASSIGNED,
    ],
  },
  { key: "battery", label: "Battery", types: [NotificationType.LOW_BATTERY] },
  {
    key: "sos",
    label: "SOS",
    types: [NotificationType.SOS_ALERT, NotificationType.CRASH_DETECTED],
  },
  {
    key: "group",
    label: "Group",
    types: [
      NotificationType.INVITE,
      NotificationType.MEMBERSHIP_ACCEPTED,
      NotificationType.MEMBERSHIP_REJECTED,
      NotificationType.MEMBER_REMOVED,
      NotificationType.ROLE_UPDATED,
      NotificationType.NICKNAME_UPDATED,
    ],
  },
  { key: "tips", label: "Tips", types: [] },
  { key: "offer", label: "Offer", types: [] },
];

// ─── Icon Config ──────────────────────────────────────────────────────────────

interface IconConfig {
  icon: React.ReactElement;
  backgroundColor: string;
}

const getNotificationIcon = (type: string): IconConfig => {
  const size = 20;
  const sw = { strokeWidth: 2 };

  switch (type as NotificationType) {
    case NotificationType.LOW_BATTERY:
      return {
        icon: <BatteryLow size={size} color="#3C3489" {...sw} />,
        backgroundColor: "#CECBF6",
      };
    case NotificationType.SOS_ALERT:
      return {
        icon: <AlertCircle size={size} color="#712B13" {...sw} />,
        backgroundColor: "#F5C4B3",
      };
    case NotificationType.CRASH_DETECTED:
      return {
        icon: <Car size={size} color="#712B13" {...sw} />,
        backgroundColor: "#F5C4B3",
      };
    case NotificationType.LOCATION_REACHED:
      return {
        icon: <MapPin size={size} color="#085041" {...sw} />,
        backgroundColor: "#9FE1CB",
      };
    case NotificationType.LOCATION_LEFT:
      return {
        icon: <LogOut size={size} color="#633806" {...sw} />,
        backgroundColor: "#FAC775",
      };
    case NotificationType.LOCATION_ADDED:
      return {
        icon: <MapPinPlus size={size} color="#085041" {...sw} />,
        backgroundColor: "#9FE1CB",
      };
    case NotificationType.LOCATION_REMOVED:
      return {
        icon: <MapPinOff size={size} color="#633806" {...sw} />,
        backgroundColor: "#FAC775",
      };
    case NotificationType.LOCATION_ASSIGNED:
      return {
        icon: <LocateFixed size={size} color="#085041" {...sw} />,
        backgroundColor: "#9FE1CB",
      };
    case NotificationType.LOCATION_UNASSIGNED:
      return {
        icon: <LocateOff size={size} color="#633806" {...sw} />,
        backgroundColor: "#FAC775",
      };
    case NotificationType.INVITE:
      return {
        icon: <UserPlus size={size} color="#3C3489" {...sw} />,
        backgroundColor: "#CECBF6",
      };
    case NotificationType.MEMBERSHIP_ACCEPTED:
      return {
        icon: <CheckCircle2 size={size} color="#27500A" {...sw} />,
        backgroundColor: "#C0DD97",
      };
    case NotificationType.MEMBERSHIP_REJECTED:
      return {
        icon: <XCircle size={size} color="#712B13" {...sw} />,
        backgroundColor: "#F5C4B3",
      };
    case NotificationType.MEMBER_REMOVED:
      return {
        icon: <UserMinus size={size} color="#712B13" {...sw} />,
        backgroundColor: "#F5C4B3",
      };
    case NotificationType.ROLE_UPDATED:
      return {
        icon: <ShieldCheck size={size} color="#3C3489" {...sw} />,
        backgroundColor: "#CECBF6",
      };
    case NotificationType.NICKNAME_UPDATED:
      return {
        icon: <Tag size={size} color="#3C3489" {...sw} />,
        backgroundColor: "#CECBF6",
      };
    default:
      return {
        icon: <Bell size={size} color="#3C3489" {...sw} />,
        backgroundColor: "#CECBF6",
      };
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return `Yesterday`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const matchesFilter = (item: NotificationItem, filter: FilterKey): boolean => {
  const group = FILTER_GROUPS.find((g) => g.key === filter);
  if (!group) return true;
  if (group.types === "all") return true;
  return (group.types as NotificationType[]).includes(
    item.type as NotificationType,
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  notifications: propNotifications,
  onRefresh,
  isLoading: externalLoading = false,
}) => {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const [activeFilter, setActiveFilter] = useState<FilterKey>("circle");
  const [markingReadId, setMarkingReadId] = useState<string | number | null>(
    null,
  );

  // FIX: was { perPage: 20, page: 20 } — page 20 returned an empty/wrong
  // slice of results, and the params didn't match MapScreen's query
  // ({ page: 1, perPage: 20 }, 15000ms interval), so react-query treated
  // this as a *different* query and polled it separately (duplicate
  // network calls + duplicate intervals running at once). Using the same
  // params + interval here lets react-query dedupe against the parent's
  // cached query instead of firing its own second poll.
  const {
    data: notificationsResponse,
    isLoading: fetchingNotifications,
    refetch: notificationRefetch,
  } = useGetNotifications({ page: 1, perPage: 20 }, 15000);

  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markReadAll, isPending: markingAllRead } = useMarkAllAsRead();

  const notifications: NotificationItem[] = useMemo(() => {
    // FIX: propNotifications was sometimes passed the whole API response
    // object (e.g. { data: { notifications: [...] } }) instead of the
    // array itself. Spreading a non-array threw "iterator method is not
    // callable". Guard with Array.isArray so a wrong shape degrades to an
    // empty list instead of crashing the screen.
    const candidate = Array.isArray(propNotifications)
      ? propNotifications
      : notificationsResponse?.data?.notifications;
    const source = Array.isArray(candidate) ? candidate : [];
    return [...source].sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [propNotifications, notificationsResponse]);

  const loading =
    externalLoading || (!propNotifications && fetchingNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Filtering + sorting: unread always above read ───────────────────────────

  const filteredNotifications = useMemo(
    () => notifications.filter((n) => matchesFilter(n, activeFilter)),
    [notifications, activeFilter],
  );
  const unreadNotifications = filteredNotifications.filter((n) => !n.read);
  const readNotifications = filteredNotifications.filter((n) => n.read);

  // FIX: badges used to show the *total* number of notifications in a
  // category. Now they show only the *unread* count in that category, so
  // the chip badge matches what "unread" actually means to the user.
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      circle: notifications.filter((n) => !n.read).length,
      status: 0,
      battery: 0,
      sos: 0,
      group: 0,
      tips: 0,
      offer: 0,
    };
    FILTER_GROUPS.forEach((group) => {
      if (group.key === "circle") return;
      counts[group.key] = notifications.filter(
        (n) => !n.read && matchesFilter(n, group.key),
      ).length;
    });
    return counts;
  }, [notifications]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleMarkAsRead = (item: NotificationItem) => {
    if (markingReadId !== null) return; // avoid double-taps mid-flight
    setMarkingReadId(item.id);
    markRead(item.id, {
      onSuccess: () => {
        if (propNotifications) {
          onRefresh?.();
        } else {
          notificationRefetch();
        }
      },
      onSettled: () => {
        setMarkingReadId(null);
      },
    });
  };

  const handleMarkAllAsRead = () => {
    markReadAll("", {
      onSuccess: () => {
        if (propNotifications) {
          onRefresh?.();
        } else {
          notificationRefetch();
        }
      },
    });
  };

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = (item: NotificationItem) => {
    const { icon, backgroundColor } = getNotificationIcon(item.type);
    const title =
      item.metadata?.title ||
      item.metadata?.Title ||
      capitalize(item.type) ||
      "Notification";
    const message = item.message || "No details provided.";
    const time = formatTime(item.createdAt);

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        activeOpacity={0.85}
      >
        <View style={[styles.iconBox, { backgroundColor }]}>{icon}</View>

        <View style={styles.cardBody}>
          <Text
            style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {message}
          </Text>
          <Text style={styles.cardTime}>{time}</Text>

          {!item.read &&
            (markingReadId === item.id ? (
              <View style={[styles.markReadBtn, styles.markReadBtnLoading]}>
                <ActivityIndicator
                  size="small"
                  color={t.colors.textOnPrimary}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.markReadBtn}
                onPress={() => handleMarkAsRead(item)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                disabled={markingReadId !== null}
              >
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            ))}
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderSectionLabel = (label: string) => (
    <Text style={styles.sectionLabel}>{label}</Text>
  );

  const renderFilterChips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterRow}
    >
      {FILTER_GROUPS.map((group) => {
        const isActive = activeFilter === group.key;
        const count = filterCounts[group.key];
        return (
          <TouchableOpacity
            key={group.key}
            onPress={() => setActiveFilter(group.key)}
            activeOpacity={0.8}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive,
              ]}
            >
              {group.label}
            </Text>
            {count > 0 && (
              <View
                style={[
                  styles.filterBadge,
                  isActive && styles.filterBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    isActive && styles.filterBadgeTextActive,
                  ]}
                >
                  {count > 99 ? "99+" : count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── List content ────────────────────────────────────────────────────────────
  // A plain ScrollView is used here since everything renders at once
  // (no virtualization needed for this list size).

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      );
    }

    if (filteredNotifications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Bell size={40} color={t.colors.textDisabled} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySubtitle}>No notifications here</Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {unreadNotifications.length > 0 && (
          <>
            {renderSectionLabel("Unread")}
            {unreadNotifications.map((item) => (
              <View key={item.id} style={styles.itemWrapper}>
                {renderItem(item)}
              </View>
            ))}
          </>
        )}

        {readNotifications.length > 0 && (
          <>
            {renderSectionLabel("Read")}
            {readNotifications.map((item) => (
              <View key={item.id} style={styles.itemWrapper}>
                {renderItem(item)}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
      onRequestClose={onClose}
    >
      <ModalSafeArea style={styles.screen} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount} new</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={t.colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        {renderFilterChips()}

        {/* Content */}
        <View style={styles.contentArea}>{renderContent()}</View>

        {/* Footer — mark all as read */}
        {!loading && unreadCount > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              activeOpacity={0.8}
              disabled={markingAllRead}
            >
              {markingAllRead ? (
                <View style={styles.markAllLoadingRow}>
                  <ActivityIndicator size="small" color={t.colors.primary} />
                  <Text style={styles.markAllText}>Marking...</Text>
                </View>
              ) : (
                <Text style={styles.markAllText}>Mark all as read</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ModalSafeArea>
    </Modal>
  );
};

export default NotificationModal;

// ─── Styles ───────────────────────────────────────────────────────────────────
// Built from the app's theme, so this modal follows dark/light mode
// automatically, and now lays out as a full screen instead of a bottom sheet.

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,
    },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      backgroundColor: t.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.divider,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[2],
    },
    headerTitle: {
      fontSize: t.typography.size.lg,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
    },
    badge: {
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.full,
      paddingHorizontal: t.space[2],
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textOnPrimary,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.hoverBg,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },

    // Filter chips
    filterScroll: {
      flexGrow: 0,
      flexShrink: 0,
      height: 52,
      backgroundColor: t.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.divider,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: t.space[3],
      gap: t.space[2],
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 32,
      paddingHorizontal: t.space[3],
      borderRadius: t.radius.full,
      backgroundColor: t.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    filterChipActive: {
      backgroundColor: t.colors.primary,
      borderColor: t.colors.primary,
    },
    filterChipText: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.medium,
      color: t.colors.textSecondary,
    },
    filterChipTextActive: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.semibold,
    },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      backgroundColor: t.colors.error,
    },
    filterBadgeActive: {
      backgroundColor: "rgba(255,255,255,0.3)",
    },
    filterBadgeText: {
      fontSize: 10,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textOnPrimary,
    },
    filterBadgeTextActive: {
      color: t.colors.textOnPrimary,
    },

    // Content
    contentArea: { flex: 1 },
    listContent: {
      paddingHorizontal: t.space[3],
      paddingTop: t.space[2],
      paddingBottom: t.space[3],
    },
    sectionLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: t.typography.tracking.wide,
      paddingHorizontal: 6,
      paddingTop: t.space[3],
      paddingBottom: 6,
    },
    itemWrapper: { marginBottom: 6 },

    // Card
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: t.space[3],
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    cardUnread: {
      backgroundColor: t.colors.selectedBg,
      borderColor: t.colors.primaryLight,
      borderLeftWidth: 3,
      borderLeftColor: t.colors.primary,
      borderRadius: 0,
      borderTopRightRadius: t.radius.lg,
      borderBottomRightRadius: t.radius.lg,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: t.space[3],
      marginTop: 1,
      flexShrink: 0,
    },
    cardBody: { flex: 1, minWidth: 0 },
    cardTitle: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textPrimary,
      marginBottom: 2,
    },
    cardTitleUnread: { color: t.colors.primaryDark },
    cardMessage: {
      fontSize: t.typography.size.xs,
      color: t.colors.textSecondary,
      lineHeight: t.typography.size.xs * t.typography.leading.loose,
      marginBottom: 4,
    },
    cardTime: { fontSize: t.typography.size.xs, color: t.colors.textTertiary },
    markReadBtn: {
      marginTop: 7,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.sm,
      alignSelf: "flex-start",
    },
    markReadText: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textOnPrimary,
    },
    markReadBtnLoading: {
      alignItems: "center",
      justifyContent: "center",
      minWidth: 78,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: t.colors.primary,
      marginLeft: t.space[2],
      marginTop: 6,
      flexShrink: 0,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    // Empty
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: t.space[10],
      gap: t.space[2],
    },
    emptyTitle: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textPrimary,
      marginTop: t.space[3],
    },
    emptySubtitle: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
    },

    // Footer
    footer: {
      paddingHorizontal: t.space[3],
      paddingTop: t.space[2],
      paddingBottom: t.space[1],
      borderTopWidth: 1,
      borderTopColor: t.colors.divider,
      backgroundColor: t.colors.background,
    },
    markAllBtn: {
      width: "100%",
      paddingVertical: t.space[3],
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    markAllText: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.primary,
    },
    markAllLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  });
}