import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {useTheme,  Theme } from '@/src/constants/theme';
import ModalSafeArea from '@/src/components/ModalSafeArea';


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CirclePrivacySettings {
  shareLocation: boolean;
  shareBattery: boolean;
  shareAvatar: boolean;
}

interface CirclePrivacyScreenProps {
  circleName: string;
  settings: CirclePrivacySettings;
  fetching?: boolean;
  loading?: boolean;
  visible : boolean
  onClose: () => void;
  onSave: (settings: CirclePrivacySettings) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row
// ─────────────────────────────────────────────────────────────────────────────

interface PrivacyToggleRowProps {
  theme: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
}

function PrivacyToggleRow({
  theme,
  icon,
  title,
  description,
  value,
  onValueChange,
  isFirst,
  isLast,
}: PrivacyToggleRowProps) {
  const { colors, space, radius, typography } = theme;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: space[4],
        paddingHorizontal: space[4],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
        borderTopLeftRadius: isFirst ? radius.xl : 0,
        borderTopRightRadius: isFirst ? radius.xl : 0,
        borderBottomLeftRadius: isLast ? radius.xl : 0,
        borderBottomRightRadius: isLast ? radius.xl : 0,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.lg,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: space[3],
        }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={{ flex: 1, marginRight: space[3] }}>
        <Text
          style={{
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold,
            color: colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: typography.size.sm,
            color: colors.textSecondary,
            lineHeight: typography.size.sm * typography.leading.normal,
          }}
        >
          {description}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CirclePrivacyScreen({
  circleName,
  settings,
  fetching = false,
  loading = false,
  onClose,
  onSave,
  visible = false
}: CirclePrivacyScreenProps) {
  const theme = useTheme();
  const { colors, space, radius, typography, shadows } = theme;

  const [local, setLocal] = useState<CirclePrivacySettings>(settings);


  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const update = useCallback((key: keyof CirclePrivacySettings, value: boolean) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <ModalSafeArea style={{ flex: 1, backgroundColor: colors.backgroundAlt }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: space[4],
          paddingVertical: space[3],
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable onPress={onClose} hitSlop={10} style={{ width: 40 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            marginRight: 40,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold,
            color: colors.textPrimary,
          }}
        >
          Circle Privacy
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space[4],
          paddingTop: space[6],
          paddingBottom: space[6],
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon + intro */}
        <View
          style={{
            alignSelf: 'center',
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space[4],
          }}
        >
          <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
        </View>
        <Text
          style={{
            fontSize: typography.size.xl,
            fontWeight: typography.weight.bold,
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: space[1],
          }}
        >
          Privacy Control
        </Text>
        <Text
          style={{
            fontSize: typography.size.sm,
            color: colors.textTertiary,
            textAlign: 'center',
            marginBottom: space[6],
            paddingHorizontal: space[4],
          }}
        >
          Manage what you share with members of the `{circleName}` circle
        </Text>

        {/* Toggle card */}
        {fetching ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: space[10],
              alignItems: 'center',
              justifyContent: 'center',
              ...shadows.sm,
            }}
          >
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              ...shadows.sm,
            }}
          >
            <PrivacyToggleRow
              theme={theme}
              icon="location"
              title="Share Location"
              description="Allow circle members to see your real-time position on the map"
              value={local.shareLocation}
              onValueChange={(v) => update('shareLocation', v)}
              isFirst
            />
            <PrivacyToggleRow
              theme={theme}
              icon="battery-charging"
              title="Share Battery Status"
              description="Show your current battery percentage and charging state to members"
              value={local.shareBattery}
              onValueChange={(v) => update('shareBattery', v)}
            />
            <PrivacyToggleRow
              theme={theme}
              icon="person-circle"
              title="Share Avatar"
              description="Display your profile photo on map markers instead of generic initials"
              value={local.shareAvatar}
              onValueChange={(v) => update('shareAvatar', v)}
              isLast
            />
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: space[4],
          paddingTop: space[3],
          paddingBottom: Platform.select({ ios: space[3], android: space[4] }),
        }}
      >
        <Pressable
          onPress={() => onSave(local)}
          disabled={loading || fetching}
          style={({ pressed }) => ({
            backgroundColor: pressed ? colors.primaryDark : colors.primary,
            borderRadius: radius.lg,
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1,
            ...shadows.md,
          })}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <Text
              style={{
                fontSize: typography.size.md,
                fontWeight: typography.weight.semibold,
                color: colors.textOnPrimary,
              }}
            >
              Save Changes
            </Text>
          )}
        </Pressable>
      </View>
    </ModalSafeArea>
    </Modal>
  );
}