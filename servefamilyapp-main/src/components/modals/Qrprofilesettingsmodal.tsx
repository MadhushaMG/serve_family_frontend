import React, { useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { API_BASE_URL } from "@/src/api/axiosInstance";

import { useTheme } from "@/src/constants/theme";
import { useGenerateQr } from "@/src/hooks/Useqr";
import ModalSafeArea from "@/src/components/ModalSafeArea";
import AsyncStorage from "@react-native-async-storage/async-storage";

const QR_STORAGE_KEY = "@qr_profile_saved_data";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface QRProfileSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialDisplayName?: string;
  initialPhoneNumber?: string;
  initialOtherDetails?: string;
  initialShowDetails?: boolean;
  initialIsActive?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({
  t,
  children,
}: {
  t: ReturnType<typeof useTheme>;
  children: string;
}) {
  return (
    <Text
      style={{
        fontSize: t.typography.size.sm,
        fontWeight: t.typography.weight.semibold,
        color: t.colors.textSecondary,
        marginBottom: t.space[2],
      }}
    >
      {children}
    </Text>
  );
}

function ToggleRow({
  t,
  title,
  description,
  value,
  onValueChange,
}: {
  t: ReturnType<typeof useTheme>;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: t.space[3],
      }}
    >
      <View style={{ flex: 1, marginRight: t.space[3] }}>
        <Text
          style={{
            fontSize: t.typography.size.base,
            fontWeight: t.typography.weight.semibold,
            color: t.colors.textPrimary,
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: t.typography.size.xs,
            color: t.colors.textTertiary,
            lineHeight: t.typography.size.xs * t.typography.leading.normal,
          }}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: t.colors.border, true: t.colors.primary }}
        thumbColor={Platform.OS === "android" ? t.colors.surface : undefined}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

export default function QRProfileSettingsModal({
  visible,
  onClose,
  initialDisplayName = "",
  initialPhoneNumber = "",
  initialOtherDetails = "",
  initialShowDetails = true,
  initialIsActive = true,
}: QRProfileSettingsModalProps) {
  const t = useTheme();
  const qrRef = useRef<any>(null);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [otherDetails, setOtherDetails] = useState(initialOtherDetails);
  const [showDetails, setShowDetails] = useState(initialShowDetails);
  const [isActive, setIsActive] = useState(initialIsActive);

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { mutate: generateQr, isPending: generating } = useGenerateQr();

  // Load previously saved QR data if API was called before
  React.useEffect(() => {
    if (!visible) return;
    const loadSavedData = async () => {
      try {
        const savedJson = await AsyncStorage.getItem(QR_STORAGE_KEY);
        if (savedJson) {
          const data = JSON.parse(savedJson);
          if (data.displayName && !initialDisplayName) setDisplayName(data.displayName);
          if (data.phoneNumber && !initialPhoneNumber) setPhoneNumber(data.phoneNumber);
          if (data.otherDetails && !initialOtherDetails) setOtherDetails(data.otherDetails);
          if (data.showDetails !== undefined) setShowDetails(data.showDetails);
          if (data.isActive !== undefined) setIsActive(data.isActive);
          if (data.qrUrl) setQrUrl(data.qrUrl);
        }
      } catch (e) {
        console.warn("Failed to load saved QR profile data:", e);
      }
    };
    loadSavedData();
  }, [visible]);

  const handleGenerate = () => {
    if (!displayName.trim()) {
      Alert.alert("Validation Error", "Please enter a display name.");
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert("Validation Error", "Please enter a phone number.");
      return;
    }

    generateQr(
      { displayName, phoneNumber, otherDetails, showDetails, isActive },
      {
        onSuccess: async (response: any) => {
          const uniqCode =
            response?.data?.uniqueCode ??
            response?.data?.data?.uniqueCode ??
            response?.uniqueCode;
          if (!uniqCode) {
            Alert.alert(
              "QR generated",
              "Profile saved, but no QR link was returned by the server.",
            );
            return;
          }
          const url = `https://api.servefamily.com/api/qr/view/${uniqCode}`;
          setQrUrl(url);

          // Save QR details & API response locally so it remains saved
          try {
            const dataToSave = {
              displayName,
              phoneNumber,
              otherDetails,
              showDetails,
              isActive,
              qrUrl: url,
              uniqueCode: uniqCode,
              savedAt: new Date().toISOString(),
            };
            await AsyncStorage.setItem(QR_STORAGE_KEY, JSON.stringify(dataToSave));
            Alert.alert("Success 🎉", "QR Profile saved and generated successfully!");
          } catch (e) {
            console.warn("Failed to save QR profile locally:", e);
          }
        },
        onError: (err: any) => {
          Alert.alert(
            "Couldn't generate QR",
            err?.response?.data?.message ?? err?.message ?? "Something went wrong. Please try again.",
          );
        },
      },
    );
  };

  const handleSaveToGallery = async () => {
    if (!qrRef.current) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to save your QR code.",
        );
        setSaving(false);
        return;
      }

      qrRef.current.toDataURL(async (base64: string) => {
        try {
          const directory = FileSystem.documentDirectory ?? "";
          const fileUri = `${directory}qr-profile-${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync(
            "Serve Family",
            asset,
            false,
          ).catch(() => {});
          Alert.alert("Saved", "Your QR code was saved to your photo gallery.");
        } catch (err) {
          console.warn("Failed to save QR to gallery", err);
          Alert.alert("Something went wrong", "Couldn't save the QR code.");
        } finally {
          setSaving(false);
        }
      });
    } catch (err) {
      setSaving(false);
      console.warn("Failed to request media library permission", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ModalSafeArea
          style={{ flex: 1, backgroundColor: t.colors.backgroundAlt }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: t.space[4],
              paddingVertical: t.space[3],
              backgroundColor: t.colors.background,
              borderBottomWidth: 1,
              borderBottomColor: t.colors.divider,
            }}
          >
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={t.colors.textPrimary}
              />
            </TouchableOpacity>
            <Text
              style={{
                flex: 1,
                textAlign: "center",
                marginRight: 32,
                fontSize: t.typography.size.lg,
                fontWeight: t.typography.weight.bold,
                color: t.colors.textPrimary,
              }}
            >
              QR Profile Settings
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: t.space[4],
              paddingBottom: t.space[10],
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: t.colors.surface,
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: t.colors.border,
                padding: t.space[4],
                ...t.shadows.sm,
              }}
            >
              <Text
                style={{
                  fontSize: t.typography.size.md,
                  fontWeight: t.typography.weight.bold,
                  color: t.colors.textPrimary,
                  marginBottom: t.space[4],
                }}
              >
                Profile Details
              </Text>

              <FieldLabel t={t}>Display Name</FieldLabel>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                placeholderTextColor={t.colors.textDisabled}
                style={{
                  backgroundColor: t.colors.backgroundAlt,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  paddingHorizontal: t.space[3],
                  paddingVertical: t.space[3],
                  fontSize: t.typography.size.md,
                  color: t.colors.textPrimary,
                  marginBottom: t.space[4],
                }}
              />

              <FieldLabel t={t}>Phone Number</FieldLabel>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+94 7X XXX XXXX"
                placeholderTextColor={t.colors.textDisabled}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: t.colors.backgroundAlt,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  paddingHorizontal: t.space[3],
                  paddingVertical: t.space[3],
                  fontSize: t.typography.size.md,
                  color: t.colors.textPrimary,
                  marginBottom: t.space[4],
                }}
              />

              <FieldLabel t={t}>Other Details (Email/Info)</FieldLabel>
              <TextInput
                value={otherDetails}
                onChangeText={setOtherDetails}
                placeholder="you@example.com"
                placeholderTextColor={t.colors.textDisabled}
                autoCapitalize="none"
                style={{
                  backgroundColor: t.colors.backgroundAlt,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  paddingHorizontal: t.space[3],
                  paddingVertical: t.space[3],
                  fontSize: t.typography.size.md,
                  color: t.colors.textPrimary,
                  marginBottom: t.space[2],
                }}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: t.colors.divider,
                  marginVertical: t.space[2],
                }}
              />

              <ToggleRow
                t={t}
                title="Show Details"
                description="Allow others to see details when scanned"
                value={showDetails}
                onValueChange={setShowDetails}
              />
              <View style={{ height: 1, backgroundColor: t.colors.divider }} />
              <ToggleRow
                t={t}
                title="Is Active"
                description="Enable or disable this QR profile"
                value={isActive}
                onValueChange={setIsActive}
              />

              <TouchableOpacity
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  marginTop: t.space[4],
                  backgroundColor: "#16A34A",
                  borderRadius: t.radius.lg,
                  minHeight: 52,
                  paddingHorizontal: t.space[4],
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: generating ? 0.7 : 1,
                  shadowColor: "#16A34A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5,
                }}
              >
                {generating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: t.space[2] }}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#FFFFFF",
                      }}
                    >
                      Save & Generate QR
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {qrUrl && (
              <View
                style={{
                  backgroundColor: t.colors.surface,
                  borderRadius: t.radius.xl,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  padding: t.space[5],
                  marginTop: t.space[4],
                  alignItems: "center",
                  ...t.shadows.sm,
                }}
              >
                <Text
                  style={{
                    fontSize: t.typography.size.md,
                    fontWeight: t.typography.weight.bold,
                    color: t.colors.textPrimary,
                    marginBottom: t.space[4],
                  }}
                >
                  Your Personal QR Code
                </Text>

                <View
                  style={{
                    padding: t.space[3],
                    backgroundColor: "#FFFFFF",
                    borderRadius: t.radius.lg,
                  }}
                >
                  <QRCode
                    value={qrUrl}
                    size={180}
                    getRef={(ref) => (qrRef.current = ref)}
                  />
                </View>

                <Text
                  selectable
                  style={{
                    fontSize: t.typography.size.xs,
                    color: t.colors.textTertiary,
                    marginTop: t.space[3],
                    textAlign: "center",
                  }}
                >
                  {qrUrl}
                </Text>

                <TouchableOpacity
                  onPress={handleSaveToGallery}
                  disabled={saving}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: t.space[5],
                    paddingHorizontal: t.space[5],
                    paddingVertical: t.space[3],
                    borderRadius: t.radius.full,
                    backgroundColor: "#16A34A",
                    opacity: saving ? 0.7 : 1,
                    shadowColor: "#16A34A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 3,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="download-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: t.space[2] }}
                      />
                      <Text
                        style={{
                          fontSize: t.typography.size.sm,
                          fontWeight: t.typography.weight.bold,
                          color: "#FFFFFF",
                        }}
                      >
                        Save QR to Gallery
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </ModalSafeArea>
      </KeyboardAvoidingView>
    </Modal>
  );
}
