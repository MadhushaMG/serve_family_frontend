import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ModalSafeArea from "@/src/components/ModalSafeArea";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/constants/theme";
import { CirclesModalProps } from "../../types/Circlesmodal.types";
import { useCirclesModal } from "../../hooks/Usecirclesmodal";

const CIRCLE_NAME_SUGGESTIONS = [
  "Family",
  "Friends",
  "Office",
  "Gym Buddies",
  "Cousins",
  "Travel Group",
];

type CircleModalView = "list" | "create" | "share" | "invitations";

interface CirclesModalExtendedProps extends CirclesModalProps {
  initialView?: CircleModalView;
}

// ─── Component ─────────────────────────────────────────────────────────────────
const CirclesModal: React.FC<CirclesModalExtendedProps> = ({
  isOpen,
  onClose,
  onRefresh,
  circles,
  loadingCircles = false,
  onSelectCircle,
  shareTargetCircle,
  shareRequestId,
  onShareHandled,
  initialView,
}) => {
  const t = useTheme();
  const styles = React.useMemo(() => createStyles(t), [t]);
  const placeholderColor = t.colors.textTertiary;

  const [selectedRole, setSelectedRole] = useState<"Member" | "Admin">(
    "Member",
  );

  const viewAnim = useRef(new Animated.Value(0)).current;
  const viewOpacity = useRef(new Animated.Value(1)).current;
  const [displayedView, setDisplayedView] = useState<CircleModalView | null>(
    null,
  );

  const animateToView = (newView: string) => {
    Animated.parallel([
      Animated.timing(viewAnim, {
        toValue: -18,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(viewOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayedView(newView as CircleModalView);
      viewAnim.setValue(18);
      Animated.parallel([
        Animated.spring(viewAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(viewOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const {
    currentView,
    setCurrentView,
    resetStates,
    applyShareTarget,
    openInvitationsView,
    selectedCircleId,
    handleCircleSelect,
    newCircleName,
    setNewCircleName,
    handleCreateCircle,
    creatingCircle,
    createdCircleData,
    generatedCode,
    codeExpiry,
    inviteEmail,
    setInviteEmail,
    inviteNickname,
    setInviteNickname,
    handleSendInvite,
    sendingInvite,
    handleGenerateInvitationCode,
    generatingCode,
    handleShareCode,
    joinCode,
    setJoinCode,
    handleJoinByCode,
    joiningCircle,
    invitations,
    loadingInvitations,
    refreshingInvitations,
    loadInvitations,
    handleAcceptInvitation,
    handleRejectInvitation,
  } = useCirclesModal({
    onRefresh,
    shareTargetCircle,
    shareRequestId,
    onShareHandled,
    onClose,
  });

  const navigateToView = (view: CircleModalView) => {
    setCurrentView(view as any);
    animateToView(view);
  };

  useEffect(() => {
    if (isOpen) {
      const startView: CircleModalView = initialView ?? "list";
      setCurrentView(startView as any);
      setDisplayedView(startView);
      viewAnim.setValue(0);
      viewOpacity.setValue(1);
    } else {
      setDisplayedView(null);
      resetStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) applyShareTarget();
  }, [isOpen, applyShareTarget]);

  useEffect(() => {
    if (displayedView !== null && displayedView !== currentView) {
      animateToView(currentView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  if (!isOpen) return null;

  const hasCode = Boolean(generatedCode);
  const expiryDate = codeExpiry ? new Date(codeExpiry) : null;
  const isCodeExpired =
    hasCode && expiryDate ? expiryDate.getTime() <= Date.now() : false;
  const formattedExpiry = expiryDate
    ? `${isCodeExpired ? "Expired" : "Expires"} ${expiryDate.toLocaleString()}`
    : null;


  const renderListContent = () => (
    <View style={styles.listContentWrapper}>
      <FlashList
        data={circles}
        refreshing={loadingCircles}
        onRefresh={onRefresh}
        keyExtractor={(item) => item.id.toString()}
        nestedScrollEnabled={true}
        renderItem={({ item }) => {
          const isSelected = selectedCircleId === String(item.id);
          return (
            <TouchableOpacity
              style={[styles.circleRow, isSelected && styles.circleRowSelected]}
              onPress={() => handleCircleSelect(item.id, onSelectCircle)}
              activeOpacity={0.7}
            >
              <View
                style={[styles.tickBox, isSelected && styles.tickBoxActive]}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={13}
                    color={t.colors.textOnPrimary}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.circleNameText,
                    isSelected && styles.circleNameTextActive,
                  ]}
                >
                  {item.name ?? "Unnamed Circle"}
                </Text>
              </View>
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Text style={styles.selectedBadgeText}>Selected</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={30}
              color={t.colors.textDisabled}
            />
            <Text style={styles.emptyText}>No circles yet</Text>
            <Text style={styles.emptySubText}>
              Create your first circle below
            </Text>
          </View>
        }
      />

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigateToView("create")}
          activeOpacity={0.8}
        >
          <View style={styles.btnIconWrap}>
            <Ionicons name="add" size={18} color={t.colors.textOnPrimary} />
          </View>
          <Text style={styles.actionBtnText}>New Circle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => {
            openInvitationsView();
            navigateToView("invitations");
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.btnIconWrap, styles.btnIconWrapSecondary]}>
            <Ionicons name="mail-outline" size={15} color={t.colors.primary} />
          </View>
          <Text style={styles.actionBtnTextSecondary}>
            Join / Invites
            {invitations.length > 0 ? ` (${invitations.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCreateScreen = () => (
    <ScrollView
      contentContainerStyle={styles.fullScreenContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenHeaderWrap}>
        <View style={styles.screenHeaderIconWrap}>
          <Ionicons
            name="people-outline"
            size={22}
            color={t.colors.primary}
          />
        </View>
        <Text style={styles.fsTitle}>Name your Circle</Text>
        <Text style={styles.fsSubtitle}>
          Give your circle a name your members will recognize.
        </Text>
      </View>

      <TextInput
        style={styles.fsInput}
        placeholder="e.g. Family, Marketing Team..."
        placeholderTextColor={placeholderColor}
        value={newCircleName}
        onChangeText={setNewCircleName}
        autoFocus
      />

      <Text style={styles.suggestionLabel}>Quick picks</Text>
      <View style={styles.suggestionRow}>
        {CIRCLE_NAME_SUGGESTIONS.map((name) => (
          <TouchableOpacity
            key={name}
            style={styles.suggestionChip}
            onPress={() => handleCreateCircle(name)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionText}>{name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1, minHeight: 32 }} />

      <TouchableOpacity
        style={[
          styles.primaryButton,
          creatingCircle && styles.buttonDisabled,
        ]}
        onPress={() => handleCreateCircle()}
        disabled={creatingCircle}
        activeOpacity={0.85}
      >
        {creatingCircle ? (
          <ActivityIndicator color={t.colors.textOnPrimary} />
        ) : (
          <Text style={styles.primaryButtonText}>Create Circle</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.textBtn}
        onPress={() => navigateToView("list")}
      >
        <Text style={styles.textBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderShareScreen = () => {
    const shareIconName = !hasCode
      ? "people-circle-outline"
      : isCodeExpired
        ? "time-outline"
        : "checkmark-circle-outline";
    const shareHeading = createdCircleData?.name
      ? `Invite to ${createdCircleData.name}`
      : "Invite to your circle";

    return (
      <ScrollView
        contentContainerStyle={styles.fullScreenContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successHeader}>
          <View style={styles.screenHeaderIconWrap}>
            <Ionicons
              name={shareIconName as any}
              size={26}
              color={t.colors.primary}
            />
          </View>
          <Text style={styles.fsTitle}>{shareHeading}</Text>
          {!hasCode && (
            <Text style={styles.shareSubheading}>
              Send email invitations — no join code needed.
            </Text>
          )}
        </View>

        <View style={styles.codeDisplayContainer}>
          {hasCode && !isCodeExpired ? (
            <>
              <Text style={styles.codeLabel}>Invite Code</Text>
              <Text style={styles.codeTextH1}>{generatedCode}</Text>
              {formattedExpiry && (
                <Text style={styles.codeExpiry}>{formattedExpiry}</Text>
              )}
              <View style={styles.codeActionsRow}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShareCode}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="share-outline"
                    size={16}
                    color={t.colors.primary}
                  />
                  <Text style={styles.shareBtnText}>Share Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.regenBtn,
                    generatingCode && styles.buttonDisabled,
                  ]}
                  onPress={handleGenerateInvitationCode}
                  disabled={generatingCode}
                  activeOpacity={0.8}
                >
                  {generatingCode ? (
                    <ActivityIndicator
                      size="small"
                      color={t.colors.primary}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color={t.colors.primary}
                      />
                      <Text style={styles.regenBtnText}>New Code</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {hasCode && isCodeExpired && (
                <Text style={styles.shareWarningText}>
                  Code expired — generate a new one.
                </Text>
              )}
              {!hasCode && (
                <Text style={styles.shareInfoText}>
                  Generate a code so members can join without email.
                </Text>
              )}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  generatingCode && styles.buttonDisabled,
                  { marginTop: 12, width: "100%" },
                ]}
                onPress={handleGenerateInvitationCode}
                disabled={generatingCode}
              >
                {generatingCode ? (
                  <ActivityIndicator color={t.colors.textOnPrimary} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Generate Invite Code
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Email invite form with Member / Admin role toggle */}
        <View style={styles.inviteForm}>
          <Text style={styles.sectionTitle}>Invite via Email</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Email address (required)"
            placeholderTextColor={placeholderColor}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.formInput}
            placeholder="Nickname (optional)"
            placeholderTextColor={placeholderColor}
            value={inviteNickname}
            onChangeText={setInviteNickname}
          />

          {/* Role toggle */}
          <View style={styles.roleToggleWrap}>
            <Text style={styles.roleToggleLabel}>Role</Text>
            <View style={styles.roleToggleRow}>
              <TouchableOpacity
                style={[
                  styles.roleToggleBtn,
                  selectedRole === "Member" && styles.roleToggleBtnActive,
                ]}
                onPress={() => setSelectedRole("Member")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={
                    selectedRole === "Member"
                      ? t.colors.primaryDark
                      : t.colors.textTertiary
                  }
                />
                <Text
                  style={[
                    styles.roleToggleBtnText,
                    selectedRole === "Member" &&
                      styles.roleToggleBtnTextActive,
                  ]}
                >
                  Member
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleToggleBtn,
                  selectedRole === "Admin" && styles.roleToggleBtnActive,
                ]}
                onPress={() => setSelectedRole("Admin")}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={
                    selectedRole === "Admin"
                      ? t.colors.primaryDark
                      : t.colors.textTertiary
                  }
                />
                <Text
                  style={[
                    styles.roleToggleBtnText,
                    selectedRole === "Admin" &&
                      styles.roleToggleBtnTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.roleHint}>
              {selectedRole === "Admin"
                ? "Admins can add members and manage the circle."
                : "Members can view and participate in the circle."}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              sendingInvite && styles.buttonDisabled,
              { marginTop: 8 },
            ]}
            onPress={handleSendInvite}
            disabled={sendingInvite}
            activeOpacity={0.85}
          >
            {sendingInvite ? (
              <ActivityIndicator color={t.colors.textOnPrimary} />
            ) : (
              <View style={styles.btnInner}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={t.colors.textOnPrimary}
                />
                <Text style={styles.primaryButtonText}>
                  Send Invite as {selectedRole}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => {
            resetStates();
            onRefresh();
            navigateToView("list");
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderInvitationsContent = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.joinCodeContainer}>
        <Text style={styles.inputLabel}>Join via Code</Text>
        <View style={styles.joinCodeRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="ABC123"
            placeholderTextColor={placeholderColor}
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.joinCodeButton,
              joiningCircle && styles.buttonDisabled,
            ]}
            onPress={handleJoinByCode}
            disabled={joiningCircle}
            activeOpacity={0.85}
          >
            {joiningCircle ? (
              <ActivityIndicator
                size="small"
                color={t.colors.textOnPrimary}
              />
            ) : (
              <Text style={styles.joinCodeButtonText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text
        style={[
          styles.inputLabel,
          { marginTop: t.space[4], marginBottom: t.space[2] },
        ]}
      >
        Pending Invites
      </Text>

      {loadingInvitations ? (
        <ActivityIndicator
          size="small"
          color={t.colors.primary}
          style={{ marginTop: t.space[6] }}
        />
      ) : (
        <FlashList
          data={invitations}
          keyExtractor={(item) => item.id.toString()}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshingInvitations}
              onRefresh={loadInvitations}
              tintColor={t.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="mail-outline"
                size={26}
                color={t.colors.textDisabled}
              />
              <Text style={styles.emptyText}>No pending invites</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cName =
              item.Circle?.name ?? item.circleName ?? "Unknown Circle";
            const inviter =
              item.Circle?.creator?.name ?? item.inviterName ?? "Someone";
            const cId =
              item.circleId ??
              (item as any).circle_id ??
              item.Circle?.id ??
              "";
            return (
              <View style={styles.inviteCard}>
                <View style={styles.inviteAvatar}>
                  <Text style={styles.inviteAvatarText}>
                    {cName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: t.space[3] }}>
                  <Text style={styles.inviteTitle}>{cName}</Text>
                  <Text style={styles.inviteSub}>from {inviter}</Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptInvitation(cId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark"
                      size={17}
                      color={t.colors.textOnPrimary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectInvitation(cId)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close"
                      size={17}
                      color={t.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigateToView("list")}
      >
        <Ionicons
          name="chevron-back"
          size={16}
          color={t.colors.textTertiary}
        />
        <Text style={styles.backButtonText}>Back to Circles</Text>
      </TouchableOpacity>
    </View>
  );

  const VIEW_TITLES: Record<string, string> = {
    list: "My Circles",
    create: "New Circle",
    share: "Invite Members",
    invitations: "Invitations",
  };

  const VIEW_SUBTITLES: Record<string, string> = {
    list: "Choose a circle to share with",
    create: "Set up a new group",
    share: "Bring people in",
    invitations: "Manage your invites",
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
      onRequestClose={onClose}
    >
      <ModalSafeArea style={styles.screen} edges={["top", "bottom"]}>
        <View style={styles.modalHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={10}
            >
              <Ionicons name="close" size={20} color={t.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: t.space[3] }}>
              <Text style={styles.modalTitle}>{VIEW_TITLES[currentView]}</Text>
              <Text style={styles.modalSubtitle}>
                {VIEW_SUBTITLES[currentView]}
              </Text>
            </View>
          </View>
          {/* Tab indicator dots */}
          <View style={styles.tabDots}>
            {(["list", "create", "share", "invitations"] as const).map((v) => (
              <View
                key={v}
                style={[
                  styles.tabDot,
                  currentView === v && styles.tabDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                transform: [{ translateX: viewAnim }],
                opacity: viewOpacity,
              },
            ]}
          >
            {displayedView === "list" && renderListContent()}
            {displayedView === "create" && renderCreateScreen()}
            {displayedView === "share" && renderShareScreen()}
            {displayedView === "invitations" && renderInvitationsContent()}
          </Animated.View>
        </KeyboardAvoidingView>
      </ModalSafeArea>
    </Modal>
  );
};

export default CirclesModal;

// ─── Styles ────────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,
    },

    // Header
    modalHeader: {
      backgroundColor: t.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.divider,
      paddingTop: t.space[2],
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: t.space[5],
      paddingBottom: t.space[3],
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.hoverBg,
      alignItems: "center",
      justifyContent: "center",
    },
    modalTitle: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      letterSpacing: t.typography.tracking.tight,
    },
    modalSubtitle: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
      marginTop: 2,
    },
    tabDots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 6,
      paddingBottom: t.space[3],
    },
    tabDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.colors.border,
    },
    tabDotActive: {
      width: 20,
      backgroundColor: t.colors.primary,
    },

    contentContainer: {
      flex: 1,
      paddingHorizontal: t.space[5],
      paddingTop: t.space[5],
    },

    // List view
    listContentWrapper: {
      flex: 1,
      position: "relative",
    },
    circleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: t.space[4],
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      marginBottom: t.space[2],
      borderWidth: 1.5,
      borderColor: t.colors.border,
    },
    circleRowSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.selectedBg,
    },
    tickBox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginRight: t.space[3],
      backgroundColor: t.colors.backgroundAlt,
    },
    tickBoxActive: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    circleNameText: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.medium,
      color: t.colors.textPrimary,
    },
    circleNameTextActive: {
      color: t.colors.primaryDark,
      fontWeight: t.typography.weight.semibold,
    },
    selectedBadge: {
      backgroundColor: t.colors.primaryLight,
      paddingHorizontal: t.space[2],
      paddingVertical: 3,
      borderRadius: t.radius.sm,
    },
    selectedBadgeText: {
      fontSize: t.typography.size.xs,
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
    },

    emptyContainer: {
      alignItems: "center",
      paddingVertical: t.space[10],
    },
    emptyText: {
      fontSize: t.typography.size.md,
      color: t.colors.textTertiary,
      fontWeight: t.typography.weight.medium,
      marginTop: t.space[2],
    },
    emptySubText: {
      fontSize: t.typography.size.sm,
      color: t.colors.textDisabled,
      marginTop: 4,
    },

    actionButtonsContainer: {
      position: "absolute",
      bottom: t.space[5],
      left: 0,
      right: 0,
      flexDirection: "row",
      gap: 10,
      backgroundColor: t.colors.backgroundAlt,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: t.colors.primary,
      paddingVertical: 14,
      borderRadius: t.radius.lg,
    },
    actionBtnSecondary: {
      backgroundColor: t.colors.surface,
      borderWidth: 1.5,
      borderColor: t.colors.primary,
    },
    btnIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },
    btnIconWrapSecondary: {
      backgroundColor: t.colors.primaryLight,
    },
    actionBtnText: {
      color: t.colors.textOnPrimary,
      fontSize: t.typography.size.base,
      fontWeight: t.typography.weight.semibold,
    },
    actionBtnTextSecondary: {
      color: t.colors.primary,
      fontSize: t.typography.size.base,
      fontWeight: t.typography.weight.semibold,
    },

    // Full screen (create / share)
    fullScreenContainer: { flexGrow: 1 },
    screenHeaderWrap: { marginBottom: t.space[6] },
    screenHeaderIconWrap: {
      width: 44,
      height: 44,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[3],
    },
    fsTitle: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      letterSpacing: t.typography.tracking.tight,
      marginBottom: t.space[1],
    },
    fsSubtitle: {
      fontSize: t.typography.size.base,
      color: t.colors.textTertiary,
      lineHeight: t.typography.size.base * t.typography.leading.normal,
    },
    fsInput: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.medium,
      borderBottomWidth: 2,
      borderBottomColor: t.colors.primary,
      paddingVertical: t.space[3],
      marginBottom: t.space[6],
      color: t.colors.textPrimary,
      backgroundColor: "transparent",
    },
    suggestionLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      letterSpacing: t.typography.tracking.wide,
      textTransform: "uppercase",
      marginBottom: t.space[3],
    },
    suggestionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: t.space[2],
    },
    suggestionChip: {
      backgroundColor: t.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: t.space[2],
      borderRadius: t.radius.full,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      marginBottom: 4,
    },
    suggestionText: {
      color: t.colors.primary,
      fontWeight: t.typography.weight.medium,
      fontSize: t.typography.size.sm,
    },

    // Share screen
    successHeader: { alignItems: "center", marginBottom: t.space[5] },
    shareSubheading: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
      textAlign: "center",
      marginTop: t.space[1],
      lineHeight: t.typography.size.sm * t.typography.leading.normal,
    },
    codeDisplayContainer: {
      backgroundColor: t.colors.surface,
      padding: t.space[5],
      borderRadius: t.radius.xl,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: t.colors.border,
      marginBottom: t.space[5],
    },
    codeLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      letterSpacing: t.typography.tracking.wide,
      textTransform: "uppercase",
      marginBottom: 6,
    },
    codeTextH1: {
      fontSize: t.typography.size["4xl"],
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      letterSpacing: 5,
      marginVertical: t.space[2],
    },
    codeExpiry: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      marginBottom: 14,
    },
    shareInfoText: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
      textAlign: "center",
      marginTop: 6,
      lineHeight: t.typography.size.sm * t.typography.leading.normal,
    },
    shareWarningText: {
      fontSize: t.typography.size.sm,
      color: t.colors.error,
      textAlign: "center",
      marginTop: 6,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: t.colors.primaryLight,
      paddingHorizontal: t.space[5],
      paddingVertical: 10,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.colors.primary,
      flex: 1,
      justifyContent: "center",
    },
    shareBtnText: {
      color: t.colors.primary,
      fontWeight: t.typography.weight.bold,
      fontSize: t.typography.size.sm,
    },
    codeActionsRow: {
      flexDirection: "row",
      gap: 10,
      width: "100%",
      marginTop: 4,
    },
    regenBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: t.colors.backgroundAlt,
      paddingHorizontal: t.space[4],
      paddingVertical: 10,
      borderRadius: t.radius.md,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      justifyContent: "center",
    },
    regenBtnText: {
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.xs,
    },

    // Role toggle
    roleToggleWrap: { marginBottom: t.space[3] },
    roleToggleLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      letterSpacing: t.typography.tracking.wide,
      textTransform: "uppercase",
      marginBottom: t.space[2],
    },
    roleToggleRow: {
      flexDirection: "row",
      backgroundColor: t.colors.backgroundAlt,
      borderRadius: t.radius.md,
      padding: 4,
      gap: 4,
    },
    roleToggleBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: t.radius.sm,
    },
    roleToggleBtnActive: {
      backgroundColor: t.colors.surface,
      ...t.shadows.sm,
    },
    roleToggleBtnText: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
    },
    roleToggleBtnTextActive: {
      color: t.colors.primaryDark,
    },
    roleHint: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      marginTop: t.space[2],
      lineHeight: t.typography.size.xs * t.typography.leading.normal,
    },
    btnInner: { flexDirection: "row", alignItems: "center", gap: t.space[2] },

    // Invite form
    inviteForm: { marginBottom: t.space[5] },
    sectionTitle: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      marginBottom: 14,
    },
    formInput: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: t.typography.size.md,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      marginBottom: 10,
      color: t.colors.textPrimary,
    },

    // Buttons
    primaryButton: {
      backgroundColor: t.colors.primary,
      paddingVertical: t.space[4],
      borderRadius: t.radius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.bold,
      fontSize: t.typography.size.md,
    },
    outlineButton: {
      paddingVertical: t.space[4],
      borderRadius: t.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: t.colors.border,
      backgroundColor: t.colors.surface,
      marginBottom: t.space[2],
    },
    outlineButtonText: {
      color: t.colors.textSecondary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.md,
    },
    buttonDisabled: { opacity: 0.5 },
    textBtn: { alignItems: "center", paddingVertical: t.space[4] },
    textBtnText: {
      color: t.colors.textTertiary,
      fontSize: t.typography.size.md,
    },

    // Join code (invitations)
    joinCodeContainer: {
      backgroundColor: t.colors.surface,
      padding: 18,
      borderRadius: t.radius.xl,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      marginBottom: 4,
    },
    joinCodeRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    codeInput: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      paddingHorizontal: 14,
      paddingVertical: t.space[3],
      fontSize: t.typography.size.lg,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      textAlign: "center",
      letterSpacing: 3,
    },
    joinCodeButton: {
      backgroundColor: t.colors.success,
      paddingHorizontal: t.space[5],
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    joinCodeButtonText: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.bold,
      fontSize: t.typography.size.sm,
    },
    inputLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      letterSpacing: t.typography.tracking.wide,
      textTransform: "uppercase",
      marginBottom: 10,
    },

    // Invite cards
    inviteCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.colors.surface,
      padding: t.space[4],
      borderRadius: t.radius.lg,
      marginBottom: t.space[2],
      borderWidth: 1.5,
      borderColor: t.colors.border,
    },
    inviteAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: t.colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    inviteAvatarText: {
      fontSize: t.typography.size.lg,
      fontWeight: t.typography.weight.bold,
      color: t.colors.primary,
    },
    inviteTitle: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textPrimary,
    },
    inviteSub: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
      marginTop: 2,
    },
    inviteActions: { flexDirection: "row", gap: t.space[2] },
    acceptBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      marginTop: t.space[3],
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    backButtonText: {
      color: t.colors.textTertiary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.base,
    },
  });
}