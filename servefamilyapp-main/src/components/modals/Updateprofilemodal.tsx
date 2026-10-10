import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/src/constants/theme";
import ModalSafeArea from "@/src/components/ModalSafeArea";

export interface PreparedImage {
  uri: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface UpdateProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    metadata: string;
    avatarUpload?: PreparedImage;
  }) => Promise<void>;
  initialName?: string;
  initialMetadata?: string;
  currentAvatarUri?: string;
  prepareImageAsWebp: (
    uri: string,
    fileName: string,
    mimeType: string,
  ) => Promise<PreparedImage>;
  isLoading?: boolean;
}

export default function UpdateProfileModal({
  visible,
  onClose,
  onSave,
  initialName = "",
  initialMetadata = "",
  currentAvatarUri,
  prepareImageAsWebp,
  isLoading = false,
}: UpdateProfileModalProps) {
  const t = useTheme();
  const styles = React.useMemo(() => createStyles(t), [t]);

  const [nameInput, setNameInput] = useState(initialName);
  const [metadataInput, setMetadataInput] = useState(initialMetadata);

  const [previewUri, setPreviewUri] = useState<string | undefined>(
    currentAvatarUri,
  );
  const [avatarUpload, setAvatarUpload] = useState<PreparedImage | undefined>();

  const [isSaving, setIsSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNameInput(initialName);
      setMetadataInput(initialMetadata);
      setPreviewUri(currentAvatarUri);
      setAvatarUpload(undefined);
      setError(null);
    }
  }, [visible, initialName, initialMetadata, currentAvatarUri]);

  const handlePickImage = useCallback(async () => {
    if (isSaving || isPicking || isLoading) return;
    setError(null);
    setIsPicking(true);
    try {
      if (Platform.OS === "ios") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(
            "Permission required",
            "Allow photo library access to update your profile picture.",
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!asset.uri) return;

      const mimeType = asset.mimeType ?? "image/jpeg";
      const fileName = asset.fileName ?? `avatar_${Date.now()}`;

      const prepared = await prepareImageAsWebp(asset.uri, fileName, mimeType);

      setPreviewUri(prepared.uri);
      setAvatarUpload(prepared);
    } catch (err) {
      console.warn("Failed to pick profile image", err);
      Alert.alert(
        "Image error",
        "We couldn't open that image. Please try again.",
      );
    } finally {
      setIsPicking(false);
    }
  }, [isSaving, isPicking, isLoading, prepareImageAsWebp]);

  const handleClearSelection = useCallback(() => {
    setPreviewUri(currentAvatarUri);
    setAvatarUpload(undefined);
  }, [currentAvatarUri]);

  const handleSave = async () => {
    if (isLoading) return;
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        name: nameInput.trim(),
        metadata: metadataInput.trim(),
        avatarUpload,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
      onRequestClose={handleClose}
    >
      <ModalSafeArea style={styles.screen} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={isSaving}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={t.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: t.space[3] }}>
              <Text style={styles.title}>Update profile</Text>
              <Text style={styles.subtitle}>
                Changes apply across all circles.
              </Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={t.colors.primary} />
              <Text style={styles.loadingText}>Loading profile…</Text>
            </View>
          ) : (
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* Display name */}
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Enter your name"
                placeholderTextColor={t.colors.textDisabled}
                editable={!isSaving}
              />

              {/* Profile picture */}
              <Text style={[styles.label, styles.sectionSpacing]}>
                Profile picture
              </Text>
              <View style={styles.avatarRow}>
                <View style={styles.avatarPreview}>
                  {previewUri ? (
                    <Image
                      source={{ uri: previewUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons
                      name="person-circle-outline"
                      size={52}
                      color={t.colors.textDisabled}
                    />
                  )}
                </View>

                <View style={styles.avatarActions}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (isSaving || isPicking) && styles.primaryButtonDisabled,
                    ]}
                    onPress={handlePickImage}
                    disabled={isSaving || isPicking}
                  >
                    {isPicking ? (
                      <ActivityIndicator
                        size="small"
                        color={t.colors.textOnPrimary}
                      />
                    ) : (
                      <Text style={styles.primaryButtonText}>Choose image</Text>
                    )}
                  </TouchableOpacity>

                  {avatarUpload && (
                    <TouchableOpacity
                      style={styles.ghostButton}
                      onPress={handleClearSelection}
                      disabled={isSaving}
                    >
                      <Text style={styles.ghostButtonText}>
                        Remove selection
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Address */}
              <Text style={[styles.label, styles.sectionSpacing]}>
                Full Address
              </Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={metadataInput}
                onChangeText={setMetadataInput}
                placeholder="Enter Your Address"
                placeholderTextColor={t.colors.textDisabled}
                editable={!isSaving}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (isSaving || isLoading) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? (
                    <ActivityIndicator
                      size="small"
                      color={t.colors.textOnPrimary}
                    />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </ModalSafeArea>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
// Built from the app's theme, so this modal follows dark/light mode
// automatically, and lays out as a full screen instead of a bottom sheet.

function createStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: t.space[4],
      paddingVertical: t.space[3],
      backgroundColor: t.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.divider,
    },
    closeButton: {
      width: 34,
      height: 34,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.hoverBg,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontSize: t.typography.size.lg,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      letterSpacing: t.typography.tracking.tight,
    },
    subtitle: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
      marginTop: 2,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[3],
    },
    loadingText: {
      fontSize: t.typography.size.sm,
      color: t.colors.textTertiary,
    },

    scrollContent: {
      padding: t.space[5],
      paddingBottom: t.space[10],
    },
    label: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textTertiary,
      marginBottom: t.space[2],
      letterSpacing: t.typography.tracking.wide,
      textTransform: "uppercase",
    },
    sectionSpacing: {
      marginTop: 18,
    },
    input: {
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      paddingHorizontal: 14,
      paddingVertical: t.space[3],
      fontSize: t.typography.size.md,
      color: t.colors.textPrimary,
    },
    textarea: {
      minHeight: 90,
      paddingTop: t.space[3],
    },
    avatarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[4],
    },
    avatarPreview: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 36,
    },
    avatarActions: {
      flex: 1,
      gap: t.space[2],
    },
    primaryButton: {
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.sm,
      paddingVertical: 10,
      alignItems: "center",
    },
    primaryButtonDisabled: {
      backgroundColor: t.colors.textDisabled,
    },
    primaryButtonText: {
      color: t.colors.textOnPrimary,
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
    },
    ghostButton: {
      borderRadius: t.radius.sm,
      paddingVertical: t.space[2],
      alignItems: "center",
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    ghostButtonText: {
      color: t.colors.textTertiary,
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.medium,
    },
    errorText: {
      color: t.colors.error,
      fontSize: t.typography.size.sm,
      marginTop: t.space[3],
    },
    footer: {
      flexDirection: "row",
      gap: 10,
      marginTop: t.space[6],
    },
    cancelButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.md,
      paddingVertical: 13,
      alignItems: "center",
    },
    cancelButtonText: {
      color: t.colors.textTertiary,
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.semibold,
    },
    saveButton: {
      flex: 2,
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.md,
      paddingVertical: 13,
      alignItems: "center",
    },
    saveButtonDisabled: {
      backgroundColor: t.colors.textDisabled,
    },
    saveButtonText: {
      color: t.colors.textOnPrimary,
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.bold,
    },
  });
}