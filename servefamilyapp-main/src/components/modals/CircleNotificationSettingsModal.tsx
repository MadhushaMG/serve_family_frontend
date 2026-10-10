import {useTheme} from "@/src/constants/theme";
import { CircleNotificationSettings, NotificationRecipientType, NotificationType } from "@/src/types/Alltypes";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import ModalSafeArea from "@/src/components/ModalSafeArea";


const CircleNotificationSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  settings: CircleNotificationSettings;
  onSave: (newSettings: CircleNotificationSettings) => void;
  insets: { top: number; bottom: number; left: number; right: number };
}> = ({ visible, onClose, loading, settings, onSave }) => {
  const theme = useTheme();
  const { colors, space, radius, typography, shadows } = theme;

  const [localSettings, setLocalSettings] =
    useState<CircleNotificationSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (type: string, value: NotificationRecipientType) => {
    setLocalSettings((prev) => ({ ...prev, [type]: value }));
  };

  const notificationOptions = [
    { label: "Location Reached", key: NotificationType.LOCATION_REACHED },
    { label: "Location Left", key: NotificationType.LOCATION_LEFT },
    { label: "SOS Alert", key: NotificationType.SOS_ALERT },
    { label: "Low Battery", key: NotificationType.LOW_BATTERY },
    { label: "Crash Detected", key: NotificationType.CRASH_DETECTED },
    { label: "Invite", key: NotificationType.INVITE },
    { label: "Membership Accepted", key: NotificationType.MEMBERSHIP_ACCEPTED },
    { label: "Membership Rejected", key: NotificationType.MEMBERSHIP_REJECTED },
    { label: "Member Removed", key: NotificationType.MEMBER_REMOVED },
    { label: "Role Updated", key: NotificationType.ROLE_UPDATED },
    { label: "Nickname Updated", key: NotificationType.NICKNAME_UPDATED },
    { label: "Location Added", key: NotificationType.LOCATION_ADDED },
    { label: "Location Removed", key: NotificationType.LOCATION_REMOVED },
    { label: "Location Assigned", key: NotificationType.LOCATION_ASSIGNED },
    { label: "Location Unassigned", key: NotificationType.LOCATION_UNASSIGNED },
  ];

  const recipientOptions = [
    { label: "All Members", value: NotificationRecipientType.ALL_MEMBERS },
    {
      label: "Admins Only",
      value: NotificationRecipientType.CREATOR_AND_ADMINS,
    },
    {
      label: "Triggering User",
      value: NotificationRecipientType.TRIGGERING_USER_ONLY,
    },
    { label: "None", value: NotificationRecipientType.NONE },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
        edges={["top", "bottom"]}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: space[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <Text
            style={{
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold,
              color: colors.textPrimary,
            }}
          >
            Notification Settings
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: space[4] }}
          style={{ backgroundColor: colors.backgroundAlt }}
        >
          {notificationOptions.map((option) => (
            <View key={option.key} style={{ marginBottom: space[5] }}>
              <Text
                style={{
                  fontSize: typography.size.md,
                  fontWeight: typography.weight.semibold,
                  color: colors.textPrimary,
                  marginBottom: space[2],
                }}
              >
                {option.label}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {recipientOptions.map((recipient) => {
                  const isSelected =
                    localSettings[option.key] === recipient.value ||
                    (!localSettings[option.key] &&
                      recipient.value ===
                        NotificationRecipientType.CREATOR_AND_ADMINS);
                  return (
                    <TouchableOpacity
                      key={recipient.value}
                      style={{
                        paddingVertical: space[1.5],
                        paddingHorizontal: space[2.5],
                        borderRadius: radius.full,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primary : "transparent",
                        marginRight: space[2],
                        marginBottom: space[2],
                      }}
                      onPress={() => handleChange(option.key, recipient.value)}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                          fontSize: typography.size.sm,
                          fontWeight: isSelected
                            ? typography.weight.semibold
                            : typography.weight.medium,
                        }}
                      >
                        {recipient.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.divider,
                  marginTop: space[2],
                }}
              />
            </View>
          ))}
        </ScrollView>

        <View
          style={{
            padding: space[4],
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingVertical: space[4],
              borderRadius: radius.lg,
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
              ...shadows.sm,
            }}
            onPress={() => onSave(localSettings)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text
                style={{
                  color: colors.textOnPrimary,
                  fontWeight: typography.weight.bold,
                  fontSize: typography.size.md,
                }}
              >
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ModalSafeArea>
    </Modal>
  );
};

export default CircleNotificationSettingsModal;