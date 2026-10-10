import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/src/constants/theme";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/src/store/authStore";
import * as WebBrowser from "expo-web-browser";
import CircleNotificationSettingsModal from "@/src/components/modals/CircleNotificationSettingsModal";
import LocationSharingModal from "@/src/components/modals/Locationsharingmodal";
import CirclePrivacyScreen from "@/src/components/modals/CircleprivacyModal";
import CirclesModal from "@/src/components/modals/CirclesModal";
import UpdateProfileModal from "@/src/components/modals/Updateprofilemodal";
import { prepareImageAsWebp } from "@/src/utils/mapUtils";
import QRProfileSettingsModal from "@/src/components/modals/Qrprofilesettingsmodal";
import InviteFriendsModal from "@/src/components/modals/RefaralModal";
import DevicesModal from "@/src/components/modals/DevicesModal";
import { useState } from "react";
import { SettingsItem } from "@/src/types/Alltypes";
import { useSettingsScreen } from "@/src/hooks/screens/useSetttings";

const SettingsScreen: React.FC<{
  insets?: { top: number; bottom: number; left: number; right: number };
}> = ({ insets: insetsProp }) => {
  const safeInsets = useSafeAreaInsets();
  const insets = insetsProp ?? safeInsets;
  const router = useRouter();
  const theme = useTheme();
  const { colors, styles, space, typography } = theme;

  // ============================= USE SETTINGS ===========================
  const {
    // ============================= STORE DATA AND BACKEND DATA GET ======================
    logout,
    user,
    circles,
    circleLoading,
    UpdateCirclePrivacy,
    loadingUpdateCirclePrivacy,
    circlesList,
    isCirleloading,
    refetch,
    updateProfile,
    UpdateProfileLoading,
    isSavingCircleNotificationSettings,

    // =============================  STATE  ========================
    freqInput,
    setFreqInput,
    inviteModalVisible,
    setInviteModalVisible,
    locationSharingModalVisible,
    setLocationSharingModalVisible,
    PrivacyModalVisible,
    setPrivacyModalVisible,
    qrModalVisible,
    SetQrModalVisible,
    currentNotificationSettings,
    setIsCircleNotificationSettingsModalVisible,
    isCircleNotificationSettingsModalVisible,
    isCirclesModalOpen,
    isProfileModalVisible,
    setIsProfileModalVisible,
    handleSelectCircle,
    handleOpenCircleNotificationSettings,
    handleSaveCircleNotificationSettings,
    setIsCirclesModalOpen,
    circlesModalView,
    setCirclesModalView,
  } = useSettingsScreen();

  const [devicesModalVisible, setDevicesModalVisible] = useState(false);

  const handleManageDevices = () => {
    setDevicesModalVisible(true);
  };

  let circleName: string;
  if (circleLoading) {
    circleName = "";
  } else {
    circleName = circles?.data?.name;
  }

  const handleSmartNotifications = () => {
    handleOpenCircleNotificationSettings();
  };

  const handleLocationSharing = () => {
    setLocationSharingModalVisible(true);
  };

  const handleCirclePrivacy = () => {
    setPrivacyModalVisible(true);
  };

  const handleCreateNewCircle = () => {
    setCirclesModalView("create")
    setIsCirclesModalOpen(true);
  };

  const handleCircleManagement = () => {
    router.back();
  };

  const handleAddPeople = () => {
    setCirclesModalView("share")
    setIsCirclesModalOpen(true);
  };

  const handleAccount = () => {
    setIsProfileModalVisible(true);
  };

  const handleQrCode = () => {
    SetQrModalVisible(true);
  };

  const handleDriveDetection = () => {
    Alert.alert("Drive Detection", "This feature is coming soon.");
  };

  const handleBackgroundDiagnostics = () => {
    Alert.alert("Background Diagnostics", "No background logs recorded yet");
  };

  const handlePrivacySecurity = () => {
    WebBrowser.openBrowserAsync("https://servefamily.com/privacy");
  };

  const handleChatSupport = () => {
    Alert.alert("Chat with support", "This feature is coming soon.");
  };

  const handleAbout = () => {
    Alert.alert("About", "ServeFamily v4.0.0");
  };

  const handleInviteFriends = () => {
    setInviteModalVisible(true);
  };

  const handleDeleteAccount = () => {
    router.replace("/(Dashboard)/Deleteaccountscreen");
  };

  const handleLogOut = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          logout?.();
          router.replace("/");
        },
      },
    ]);
  };

  const handleUpdateFrequencyChange = (v: string) => {
    setFreqInput(v);

    const seconds = parseFloat(v);
    if (!isNaN(seconds) && seconds >= 0) {
      const ms = Math.round(seconds * 1000);
      useAuthStore.getState().setUpdateFrequency(String(ms));
    }
  };

  // ─── Settings lists ──────────────────────────────────────────────────
  const circleSettings: SettingsItem[] = [
    {
      key: "smart_notifications",
      label: "Smart Notifications",
      icon: "notifications-outline",
      onPress: handleSmartNotifications,
    },
    {
      key: "location_sharing",
      label: "Location Sharing",
      icon: "location-outline",
      onPress: handleLocationSharing,
    },
    {
      key: "circle_privacy",
      label: "Circle Privacy",
      icon: "shield-outline",
      onPress: handleCirclePrivacy,
    },
    {
      key: "create_new_circle",
      label: "Create New Circle",
      icon: "add-circle-outline",
      onPress: handleCreateNewCircle,
    },
    {
      key: "circle_management",
      label: `${circleName} Circle Management`,
      icon: "people-outline",
      onPress: handleCircleManagement,
    },
    {
      key: "add_people",
      label: "Add People to Circle",
      icon: "person-add-outline",
      onPress: handleAddPeople,
    },
  ];

  const appSettings: SettingsItem[] = [
    {
      key: "account",
      label: "Account",
      icon: "person-outline",
      onPress: handleAccount,
    },
    {
      key: "tracking_devices",
      label: "Tracking Devices",
      icon: "hardware-chip-outline",
      onPress: handleManageDevices,
    },
    {
      key: "qr_code",
      label: "QR Code",
      icon: "qr-code-outline",
      onPress: handleQrCode,
    },
    {
      key: "drive_detection",
      label: "Drive Detection",
      icon: "car-outline",
      onPress: handleDriveDetection,
    },
    {
      key: "background_diagnostics",
      label: "Background Diagnostics",
      icon: "pulse-outline",
      onPress: handleBackgroundDiagnostics,
    },
    {
      key: "update_frequency",
      label: "Update Frequency (seconds)",
      icon: "time-outline",
      rightElement: "input",
    },
    {
      key: "privacy_security",
      label: "Privacy & Security",
      icon: "shield-checkmark-outline",
      onPress: handlePrivacySecurity,
    },
    {
      key: "chat_support",
      label: "Chat with support",
      icon: "chatbubble-ellipses-outline",
      onPress: handleChatSupport,
    },
    {
      key: "about",
      label: "About",
      icon: "information-circle-outline",
      onPress: handleAbout,
    },
    {
      key: "invite_friends",
      label: "Invite Friends",
      icon: "people-circle-outline",
      onPress: handleInviteFriends,
    },
    {
      key: "delete_account",
      label: "Delete Account",
      icon: "trash-outline",
      danger: true,
      onPress: handleDeleteAccount,
    },
    {
      key: "log_out",
      label: "Log out",
      icon: "log-out-outline",
      onPress: handleLogOut,
    },
  ];

  const handleItemPress = (item: SettingsItem) => {
    if (item.onPress) {
      item.onPress();
      return;
    }
    Alert.alert(item.label, "This feature is coming soon.");
  };

  const renderRow = (item: SettingsItem, isLast: boolean) => {
    const iconColor = item.danger ? colors.error : colors.primary;
    const textColor = item.danger ? colors.error : colors.textPrimary;

    return (
      <TouchableOpacity
        key={item.key}
        activeOpacity={item.rightElement === "input" ? 1 : 0.7}
        onPress={() => item.rightElement !== "input" && handleItemPress(item)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: space[3],
          paddingHorizontal: space[4],
          minHeight: 52,
          borderRadius: 14,
          marginVertical: 1,
        }}
      >
        <Ionicons
          name={item.icon}
          size={20}
          color={iconColor}
          style={{ width: 32 }}
        />
        <Text
          style={{
            flex: 1,
            fontSize: typography.size.base,
            fontWeight: typography.weight.medium,
            color: textColor,
          }}
        >
          {item.label}
        </Text>

        {item.rightElement === "input" ? (
          <TextInput
            value={freqInput ?? ""}
            onChangeText={handleUpdateFrequencyChange}
            keyboardType="number-pad"
            style={{
              minWidth: 48,
              textAlign: "center",
              borderWidth: 1,
              borderColor: "rgba(226, 232, 240, 0.8)",
              borderRadius: theme.radius.sm ?? 10,
              paddingVertical: 4,
              paddingHorizontal: 8,
              color: colors.textPrimary,
              fontSize: typography.size.base,
              backgroundColor: colors.surface,
            }}
          />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (title: string, items: SettingsItem[]) => (
    <View style={{ marginBottom: space[6] }}>
      <Text
        style={{
          fontSize: typography.size.sm,
          fontWeight: typography.weight.bold,
          color: colors.primary,
          marginBottom: space[3],
          paddingHorizontal: space[2],
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          paddingVertical: 6,
          paddingHorizontal: 4,
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
            },
            android: {
              elevation: 2,
            },
          }),
        }}
      >
        {items.map((item, idx) => renderRow(item, idx === items.length - 1))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles["screen"]} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: space[4],
          paddingVertical: space[3],
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: typography.size.xl,
            fontWeight: typography.weight.bold,
            color: colors.primary,
            marginLeft: space[2],
          }}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[4],
          paddingTop: space[2],
          paddingBottom: space[6],
        }}
      >
        {renderSection(`${circleName} Circle Settings`, circleSettings)}
        {renderSection("App Settings", appSettings)}

        <CircleNotificationSettingsModal
          visible={isCircleNotificationSettingsModalVisible}
          onClose={() => setIsCircleNotificationSettingsModalVisible(false)}
          loading={isSavingCircleNotificationSettings}
          settings={currentNotificationSettings}
          onSave={handleSaveCircleNotificationSettings}
          insets={insets}
        />

        <LocationSharingModal
          visible={locationSharingModalVisible}
          onClose={() => setLocationSharingModalVisible(false)}
          circleName={circles?.data?.name}
          insets={insets}
        />

        <CirclePrivacyScreen
          visible={PrivacyModalVisible}
          circleName={circles?.data?.name ?? ""}
          settings={{
            shareLocation:
              useAuthStore.getState().privacy?.shareLocation ?? true,
            shareBattery: useAuthStore.getState().privacy?.shareBattery ?? true,
            shareAvatar: useAuthStore.getState().privacy?.shareAvatar ?? true,
          }}
          fetching={false}
          loading={loadingUpdateCirclePrivacy}
          onClose={() => setPrivacyModalVisible(false)}
          onSave={(newSettings) => {
            UpdateCirclePrivacy(newSettings, {
              onSuccess: () => setPrivacyModalVisible(false),
            });
          }}
        />

        <CirclesModal
          isOpen={isCirclesModalOpen}
          onClose={() => setIsCirclesModalOpen(false)}
          onRefresh={refetch as any}
          circles={circlesList}
          initialView={circlesModalView}
          loadingCircles={isCirleloading}
          onSelectCircle={handleSelectCircle}
        />

        <UpdateProfileModal
          key={isProfileModalVisible ? `open-${user?.id}` : "closed"}
          visible={isProfileModalVisible}
          isLoading = {UpdateProfileLoading}
          onClose={() => setIsProfileModalVisible(false)}
          onSave={async ({ name, metadata, avatarUpload }) => {
            await updateProfile({
              name: name,
              metadata: metadata,
              profileImage: avatarUpload,
            });
          }}
          initialName={user?.name as string}
          initialMetadata={user?.metadata?.address as any}
          currentAvatarUri={user?.avatar as string}
          prepareImageAsWebp={prepareImageAsWebp}
        />

        <QRProfileSettingsModal
          onClose={() => SetQrModalVisible(false)}
          visible={qrModalVisible}
          initialDisplayName={user?.name ?? ""}
          initialOtherDetails={user?.email ?? ""}
          initialPhoneNumber={user?.phoneNumber ?? ""}
        />

        <InviteFriendsModal
          onClose={() => setInviteModalVisible(false)}
          visible={inviteModalVisible}
        />

        <DevicesModal
          visible={devicesModalVisible}
          onClose={() => setDevicesModalVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
