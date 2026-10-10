import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import useTheme, { type Theme } from '../src/constants/theme';


interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface PermissionDef {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  intro: string;
  features: FeatureItem[];
  note: string;
  check: () => Promise<boolean>;
  request: () => Promise<boolean>;
}

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
};

const PERMISSIONS: PermissionDef[] = [
  {
    id: 'location',
    icon: 'location',
    title: 'Location Permission Disclosure',
    subtitle: 'Important information about your privacy',
    intro:
      'Serve Family collects your location data to provide essential family safety features:',
    features: [
      {
        icon: 'bus',
        title: 'Real-Time Tracking',
        description:
          'Track school bus and family members in real-time on a private map.',
      },
      {
        icon: 'notifications',
        title: 'Place Alerts',
        description:
          'Receive notifications when family members arrive at or leave designated locations.',
      },
      {
        icon: 'shield-checkmark',
        title: 'Background Usage',
        description:
          'This app collects location data even when the app is closed or not in use to ensure safety features work reliably.',
      },
    ],
    note: 'Your data is encrypted and NOT shared with third parties.',
    check: async () => {
      try {
        const fg = await withTimeout(Location.getForegroundPermissionsAsync(), 2000, { status: 'undetermined' } as any);
        if (fg.status !== 'granted') return false;
        const bg = await withTimeout(Location.getBackgroundPermissionsAsync(), 2000, { status: 'undetermined' } as any);
        return bg.status === 'granted';
      } catch (e) {
        console.warn('Check location permission error:', e);
        return false;
      }
    },
    request: async () => {
      // Place 1 (Disclosure Screen): Informative agreement only.
      // All system permission dialogs (Foreground, Background & Notifications) are consolidated into Place 2.
      return true;
    },
  },
  {
    id: 'notifications',
    icon: 'notifications',
    title: 'Notification Permission',
    subtitle: 'Stay updated on family safety',
    intro: 'Serve Family sends notifications to keep you informed:',
    features: [
      {
        icon: 'flag',
        title: 'Place Alerts',
        description:
          'Get notified the moment a family member arrives at or leaves a saved location.',
      },
      {
        icon: 'alert-circle',
        title: 'Emergency SOS Alerts',
        description:
          'Receive urgent alerts immediately when a family member triggers an SOS.',
      },
    ],
    note: 'You can change notification preferences anytime in Settings.',
    check: async () => {
      try {
        const res = await withTimeout(Notifications.getPermissionsAsync(), 2000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Check notification permission error:', e);
        return false;
      }
    },
    request: async () => {
      try {
        const res = await withTimeout(Notifications.requestPermissionsAsync(), 4000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Request notification permission error:', e);
        return false;
      }
    },
  },
  {
    id: 'photoLibrary',
    icon: 'image',
    title: 'Photo Library Access',
    subtitle: 'Personalize your profile',
    intro: 'Serve Family accesses your photos so you can:',
    features: [
      {
        icon: 'person-circle',
        title: 'Profile Picture',
        description:
          'Choose a photo from your library to set as your family profile picture.',
      },
    ],
    note: 'Photos are only used for the picture you choose to upload.',
    check: async () => {
      if (Platform.OS === 'android') return true;
      try {
        const res = await withTimeout(ImagePicker.getMediaLibraryPermissionsAsync(), 2000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Check photo library permission error:', e);
        return false;
      }
    },
    request: async () => {
      if (Platform.OS === 'android') return true;
      try {
        const res = await withTimeout(ImagePicker.requestMediaLibraryPermissionsAsync(), 4000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Request photo library permission error:', e);
        return false;
      }
    },
  },
  {
    id: 'camera',
    icon: 'camera',
    title: 'Camera & Video Access',
    subtitle: 'Capture photos and emergency video',
    intro: 'Serve Family uses your camera for:',
    features: [
      {
        icon: 'camera',
        title: 'Profile & Document Photos',
        description:
          'Take profile pictures and scan ID or vehicle documents directly from the camera.',
      },
      {
        icon: 'videocam',
        title: 'Emergency Safety Capture',
        description:
          'Capture photos or video during emergency SOS alerts to inform family members.',
      },
    ],
    note: 'Camera access is only activated when you explicitly take a photo or trigger an emergency.',
    check: async () => {
      try {
        const res = await withTimeout(ImagePicker.getCameraPermissionsAsync(), 2000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Check camera permission error:', e);
        return false;
      }
    },
    request: async () => {
      try {
        const res = await withTimeout(ImagePicker.requestCameraPermissionsAsync(), 4000, { status: 'undetermined' } as any);
        return res.status === 'granted';
      } catch (e) {
        console.warn('Request camera permission error:', e);
        return false;
      }
    },
  },
];



function FeatureRow({ theme, icon, title, description, accentColor }: FeatureItem & { theme: Theme; accentColor?: string }) {
  const { colors, space, radius, typography } = theme;
  const mainColor = accentColor ?? colors.primary;
  return (
    <View style={{ flexDirection: 'row', marginBottom: space[5] }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.lg,
          backgroundColor: mainColor === '#16A34A' ? '#DCFCE7' : '#DBEAFE',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: space[3],
        }}
      >
        <Ionicons name={icon} size={20} color={mainColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: typography.size.md,
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
            lineHeight: typography.size.sm * typography.leading.normal,
            color: colors.textSecondary,
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

function StepDots({ theme, total, current, activeColor }: { theme: Theme; total: number; current: number; activeColor?: string }) {
  if (total <= 1) return null;
  const { colors, space } = theme;
  const dotColor = activeColor ?? colors.primary;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: space[5] }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 3,
            marginHorizontal: 3,
            backgroundColor: i === current ? dotColor : colors.border,
          }}
        />
      ))}
    </View>
  );
}


interface PermissionDisclosureScreenProps {
  def: PermissionDef;
  step: number;
  total: number;
  loading: boolean;
  onAgree: () => void;
  onNotNow: () => void;
}

function PermissionDisclosureScreen({
  def,
  step,
  total,
  loading,
  onAgree,
  onNotNow,
}: PermissionDisclosureScreenProps) {
  const theme = useTheme();
  const { colors, space, radius, typography } = theme;
  const insets = useSafeAreaInsets();

  const isLastStep = step === total - 1;
  const buttonColor = isLastStep ? '#4ADE80' : '#60A5FA';
  const buttonPressedColor = isLastStep ? '#22C55E' : '#3B82F6';
  const buttonBorderColor = isLastStep ? '#15803D' : '#1D4ED8';
  const buttonText = isLastStep ? 'Agree & Finish' : 'Agree & Continue';
  const bgIconCircle = isLastStep ? '#DCFCE7' : '#DBEAFE';

  const bottomInset = insets?.bottom ? Math.max(insets.bottom, space[4]) : space[4];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space[6],
          paddingTop: space[4],
          paddingBottom: space[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        <StepDots theme={theme} total={total} current={step} activeColor={isLastStep ? '#16A34A' : '#2563EB'} />

        <View
          style={{
            alignSelf: 'center',
            width: 72,
            height: 72,
            borderRadius: radius.full,
            backgroundColor: bgIconCircle,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space[5],
          }}
        >
          <Ionicons name={def.icon} size={32} color={isLastStep ? '#16A34A' : '#2563EB'} />
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
          {def.title}
        </Text>
        <Text
          style={{
            fontSize: typography.size.sm,
            color: colors.textTertiary,
            textAlign: 'center',
            marginBottom: space[5],
          }}
        >
          {def.subtitle}
        </Text>

        <Text
          style={{
            fontSize: typography.size.base,
            lineHeight: typography.size.base * typography.leading.normal,
            color: colors.textSecondary,
            marginBottom: space[5],
          }}
        >
          {def.intro}
        </Text>

        {def.features.map((f) => (
          <FeatureRow key={f.title} theme={theme} accentColor={isLastStep ? '#16A34A' : '#2563EB'} {...f} />
        ))}

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: isLastStep ? '#F0FDF4' : '#EFF6FF',
            borderRadius: radius.lg,
            padding: space[4],
            marginTop: space[2],
            marginBottom: space[4],
          }}
        >
          <Ionicons
            name="lock-closed"
            size={16}
            color={isLastStep ? '#16A34A' : '#2563EB'}
            style={{ marginRight: space[2], marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: typography.size.sm,
              lineHeight: typography.size.sm * typography.leading.normal,
              color: isLastStep ? '#166534' : '#1E40AF',
            }}
          >
            {def.note}
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: space[5],
          paddingTop: space[3],
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={onNotNow}
          disabled={loading}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: radius.lg,
            minHeight: 50,
            paddingHorizontal: space[3],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? '#CBD5E1' : '#F1F5F9',
            borderWidth: 1,
            borderColor: '#CBD5E1',
            marginRight: space[2],
          })}
        >
          <Text
            style={{
              fontSize: typography.size.md,
              fontWeight: '600',
              color: '#334155',
              includeFontPadding: false,
              textAlignVertical: 'center',
            }}
            numberOfLines={1}
          >
            Not Now
          </Text>
        </Pressable>

        <Pressable
          onPress={onAgree}
          disabled={loading}
          style={({ pressed }) => ({
            flex: 1.5,
            borderRadius: radius.lg,
            minHeight: 50,
            paddingHorizontal: space[4],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? buttonPressedColor : buttonColor,
            borderWidth: 1.5,
            borderColor: buttonBorderColor,
            opacity: loading ? 0.7 : 1,
            marginLeft: space[2],
          })}
        >
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text
                style={{
                  fontSize: typography.size.md,
                  fontWeight: '700',
                  color: '#000000',
                  includeFontPadding: false,
                  textAlignVertical: 'center',
                  marginRight: 6,
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {buttonText}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#000000" />
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}



export function PermissionsFlowGate({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [status, setStatus] = useState<'checking' | 'flowing' | 'done'>('checking');
  const [queue, setQueue] = useState<PermissionDef[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const buildQueue = useCallback(async () => {
    try {
      const alreadyCompleted = await AsyncStorage.getItem('has_completed_permission_disclosure');
      if (alreadyCompleted === 'true') {
        setStatus('done');
        return;
      }

      const pending: PermissionDef[] = [];
      for (const def of PERMISSIONS) {
        try {
          const granted = await def.check();
          if (!granted) pending.push(def);
        } catch (e) {
          console.warn(`Error checking permission ${def.id}:`, e);
        }
      }
      setQueue(pending);
      setIndex(0);
      if (pending.length === 0) {
        await AsyncStorage.setItem('has_completed_permission_disclosure', 'true');
        setStatus('done');
      } else {
        setStatus('flowing');
      }
    } catch (e) {
      console.error('Error building permission queue:', e);
      setStatus('done');
    }
  }, []);

  useEffect(() => {
    buildQueue();
  }, [buildQueue]);

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= queue.length) {
        AsyncStorage.setItem('has_completed_permission_disclosure', 'true').catch(() => {});
        setStatus('done');
        return i;
      }
      return next;
    });
  }, [queue.length]);

  const handleAgree = useCallback(async () => {
    const current = queue[index];
    if (!current) {
      advance();
      return;
    }
    setLoading(true);
    try {
      await withTimeout(current.request(), 4500, false);
    } catch (err) {
      console.error('Error requesting permission:', err);
    } finally {
      setLoading(false);
      advance();
    }
  }, [queue, index, advance]);

  const handleNotNow = useCallback(() => {
    advance();
  }, [advance]);

  if (status === 'checking') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (status === 'done' || queue.length === 0) {
    return <>{children}</>;
  }

  const current = queue[index];
  if (!current) return <>{children}</>;

  return (
    <PermissionDisclosureScreen
      def={current}
      step={index}
      total={queue.length}
      loading={loading}
      onAgree={handleAgree}
      onNotNow={handleNotNow}
    />
  );
}

export default PermissionsFlowGate;