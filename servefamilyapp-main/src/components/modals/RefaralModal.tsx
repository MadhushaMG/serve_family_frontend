import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/src/constants/theme";
import {
  useGenerateReferralLink,
  useGetReferrerInfo,
} from "@/src/hooks/Usereferral";
import ModalSafeArea from "@/src/components/ModalSafeArea";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pieces
// ─────────────────────────────────────────────────────────────────────────────

function CopyRow({
  t,
  label,
  value,
  monospace,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  value: string;
  monospace?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={{ marginBottom: t.space[4] }}>
      <Text
        style={{
          fontSize: t.typography.size.xs,
          fontWeight: t.typography.weight.semibold,
          color: t.colors.textTertiary,
          letterSpacing: t.typography.tracking.wide,
          textTransform: "uppercase",
          marginBottom: t.space[2],
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={handleCopy}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: pressed
            ? t.colors.pressedBg
            : t.colors.backgroundAlt,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.border,
          paddingHorizontal: t.space[3],
          paddingVertical: t.space[3],
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: monospace ? t.typography.size.lg : t.typography.size.sm,
            fontWeight: monospace
              ? t.typography.weight.bold
              : t.typography.weight.regular,
            letterSpacing: monospace ? 1.5 : 0,
            color: monospace ? t.colors.primary : t.colors.textSecondary,
            marginRight: t.space[2],
          }}
        >
          {value}
        </Text>
        <Ionicons
          name={copied ? "checkmark" : "copy-outline"}
          size={18}
          color={copied ? t.colors.success : t.colors.textTertiary}
        />
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal
// ─────────────────────────────────────────────────────────────────────────────

export default function InviteFriendsModal({
  visible,
  onClose,
}: InviteFriendsModalProps) {
  const t = useTheme();
  const qrRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  // Generate the referral code / link
  const {
    mutateAsync: generateReferralLink,
    isPending: loadingReferralLink,
    isError: referralLinkError,
  } = useGenerateReferralLink();

  const [referralCode, setReferralCode] = useState<string | undefined>(
    undefined,
  );
  const [signUpLink, setSignUpLink] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    generateReferralLink(undefined, {
      onSuccess: (data: any) => {
        console.log(data.data);
        setReferralCode(data?.data?.referralCode);
        setSignUpLink(data?.data?.signupUrl);
      },
    }).catch((err) => {
      console.warn("Failed to generate referral link", err);
    });
  }, [generateReferralLink, visible]);

  const {
    data: referredStats,
    isLoading: loadingStats,
    isError: statsError,
    refetch: refetchStats,
  } = useGetReferrerInfo(referralCode ?? "");

  console.log(referredStats)

  const handleSaveToGallery = async () => {
    if (!qrRef.current) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow photo library access to save your referral QR code.",
        );
        return;
      }
      qrRef.current.toDataURL(async (base64: string) => {
        try {
          const fileUri = `${FileSystem.cacheDirectory}referral-qr-${Date.now()}.png`;
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const asset = await MediaLibrary.createAssetAsync(fileUri);
          await MediaLibrary.createAlbumAsync(
            "Serve Family",
            asset,
            false,
          ).catch(() => {});
          Alert.alert(
            "Saved",
            "Your referral QR code was saved to your gallery.",
          );
        } catch (err) {
          console.warn("Failed to save referral QR", err);
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

  const handleShare = async () => {
    if (!signUpLink) return;
    try {
      await Share.share({
        message: `Join me on Serve Family! Sign up using my link: ${signUpLink}`,
      });
    } catch (err) {
      console.warn("Share failed", err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
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
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 32 }}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={t.colors.textPrimary}
            />
          </Pressable>
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
            Invite Friends
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: t.space[4],
            paddingBottom: t.space[6],
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon + intro */}
          <View
            style={{
              alignSelf: "center",
              width: 64,
              height: 64,
              borderRadius: t.radius.full,
              backgroundColor: t.colors.primaryLight,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: t.space[4],
            }}
          >
            <Ionicons name="people" size={28} color={t.colors.primary} />
          </View>
          <Text
            style={{
              fontSize: t.typography.size.xl,
              fontWeight: t.typography.weight.bold,
              color: t.colors.textPrimary,
              textAlign: "center",
              marginBottom: t.space[1],
            }}
          >
            Invite your friends!
          </Text>
          <Text
            style={{
              fontSize: t.typography.size.sm,
              color: t.colors.textTertiary,
              textAlign: "center",
              marginBottom: t.space[6],
              paddingHorizontal: t.space[4],
            }}
          >
            Share the love and help your friends stay connected with their loved
            ones.
          </Text>

          {/* QR card */}
          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.xl,
              borderWidth: 1,
              borderColor: t.colors.border,
              padding: t.space[5],
              alignItems: "center",
              marginBottom: t.space[4],
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
              Your Referral QR Code
            </Text>

            {loadingReferralLink ? (
              <View
                style={{
                  width: 180,
                  height: 180,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator color={t.colors.primary} />
              </View>
            ) : referralLinkError || !signUpLink ? (
              <View
                style={{
                  width: 180,
                  height: 180,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={t.colors.textDisabled}
                />
                <Text
                  style={{
                    color: t.colors.textTertiary,
                    fontSize: t.typography.size.sm,
                    marginTop: t.space[2],
                  }}
                >
                  Couldn&apos;t load your QR code.
                </Text>
                <Pressable
                  onPress={() =>
                    generateReferralLink(undefined, {
                      onSuccess: (data: any) => {
                        console.log(data);
                        setReferralCode(data?.data?.referralCode);
                        setSignUpLink(data?.data?.signupUrl);
                      },
                    })
                  }
                  style={{ marginTop: t.space[2] }}
                >
                  <Text
                    style={{
                      color: t.colors.primary,
                      fontSize: t.typography.size.sm,
                      fontWeight: t.typography.weight.semibold,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={{
                  padding: t.space[3],
                  backgroundColor: "#FFFFFF",
                  borderRadius: t.radius.lg,
                }}
              >
                <QRCode
                  value={signUpLink}
                  size={180}
                  getRef={(ref) => (qrRef.current = ref)}
                />
              </View>
            )}

            {!loadingReferralLink && !referralLinkError && signUpLink && (
              <Pressable
                onPress={handleSaveToGallery}
                disabled={saving}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: t.space[5],
                  paddingHorizontal: t.space[5],
                  paddingVertical: t.space[3],
                  borderRadius: t.radius.full,
                  backgroundColor: pressed
                    ? t.colors.primaryLight
                    : t.colors.selectedBg,
                  borderWidth: 1,
                  borderColor: t.colors.primary,
                  opacity: saving ? 0.7 : 1,
                })}
              >
                {saving ? (
                  <ActivityIndicator color={t.colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="download-outline"
                      size={16}
                      color={t.colors.primary}
                      style={{ marginRight: t.space[2] }}
                    />
                    <Text
                      style={{
                        fontSize: t.typography.size.sm,
                        fontWeight: t.typography.weight.semibold,
                        color: t.colors.primary,
                      }}
                    >
                      Save to Gallery
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Referral code + link card */}
          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.xl,
              borderWidth: 1,
              borderColor: t.colors.border,
              padding: t.space[4],
              marginBottom: t.space[4],
              ...t.shadows.sm,
            }}
          >
            {loadingReferralLink ? (
              <ActivityIndicator
                color={t.colors.primary}
                style={{ paddingVertical: t.space[4] }}
              />
            ) : referralLinkError ? (
              <View
                style={{ alignItems: "center", paddingVertical: t.space[3] }}
              >
                <Text
                  style={{
                    color: t.colors.textTertiary,
                    fontSize: t.typography.size.sm,
                  }}
                >
                  Failed to load your referral code.
                </Text>
                <Pressable
                  onPress={() =>
                    generateReferralLink(undefined, {
                      onSuccess: (data: any) => {
                        console.log(data);
                        setReferralCode(data?.referralData?.referralCode);
                        setSignUpLink(data?.referralData?.signupUrl);
                      },
                    })
                  }
                  style={{ marginTop: t.space[2] }}
                >
                  <Text
                    style={{
                      color: t.colors.primary,
                      fontWeight: t.typography.weight.semibold,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <CopyRow
                  t={t}
                  label="Your Referral Code"
                  value={referralCode ?? "—"}
                  monospace
                />
                <CopyRow t={t} label="Sign Up Link" value={signUpLink ?? "—"} />
              </>
            )}
          </View>

          <View
            style={{
              backgroundColor: t.colors.surface,
              borderRadius: t.radius.xl,
              borderWidth: 1,
              borderColor: t.colors.border,
              padding: t.space[4],
              marginBottom: t.space[6],
              ...t.shadows.sm,
            }}
          >
            <Text
              style={{
                fontSize: t.typography.size.xs,
                fontWeight: t.typography.weight.semibold,
                color: t.colors.textTertiary,
                letterSpacing: t.typography.tracking.wide,
                textTransform: "uppercase",
                marginBottom: t.space[3],
              }}
            >
              Referred Members
            </Text>

            {loadingStats ? (
              <ActivityIndicator
                color={t.colors.primary}
                style={{ paddingVertical: t.space[3] }}
              />
            ) : statsError ? (
              <View
                style={{ alignItems: "center", paddingVertical: t.space[3] }}
              >
                <Text
                  style={{
                    color: t.colors.textTertiary,
                    fontSize: t.typography.size.sm,
                  }}
                >
                  Failed to load stats.
                </Text>
                <Pressable
                  onPress={() => refetchStats()}
                  style={{ marginTop: t.space[2] }}
                >
                  <Text
                    style={{
                      color: t.colors.primary,
                      fontWeight: t.typography.weight.semibold,
                      fontSize: t.typography.size.sm,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : (referredStats?.data?.length ?? 0) === 0 ? (
              <Text
                style={{
                  fontSize: t.typography.size.sm,
                  color: t.colors.textTertiary,
                  textAlign: "center",
                  paddingVertical: t.space[3],
                }}
              >
                No friends joined yet. Share your code!
              </Text>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: t.typography.size.base,
                    color: t.colors.textPrimary,
                    fontWeight: t.typography.weight.semibold,
                    textAlign: "center",
                    paddingVertical: t.space[3],
                  }}
                >
                  {referredStats.data.length} friend
                  {referredStats.data.length === 1 ? "" : "s"} joined using your
                  code
                </Text>

                <View style={{ gap: t.space[3] }}>
                  {referredStats.data.map(
                    (
                      friend : any,
                      index: number,
                    ) => (
                      <View
                        key={index}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: t.space[2],
                          borderTopWidth: 1,
                          borderTopColor: t.colors.divider,
                        }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: t.radius.full,
                            backgroundColor: t.colors.primaryLight,
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: t.space[3],
                            overflow: "hidden",
                          }}
                        >
                          {friend.avatar ? (
                            <Image
                              source={{ uri: friend.avatar }}
                              style={{ width: 36, height: 36 }}
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={18}
                              color={t.colors.primary}
                            />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: t.typography.size.sm,
                              fontWeight: t.typography.weight.semibold,
                              color: t.colors.textPrimary,
                            }}
                          >
                            {friend.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: t.typography.size.xs,
                              color: t.colors.textTertiary,
                            }}
                          >
                            {friend.package} plan
                          </Text>
                        </View>
                      </View>
                    ),
                  )}
                </View>
              </>
            )}
          </View>

          {/* Share button */}
          <Pressable
            onPress={handleShare}
            disabled={!signUpLink}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? t.colors.primaryDark
                : t.colors.primary,
              borderRadius: t.radius.lg,
              minHeight: 52,
              opacity: signUpLink ? 1 : 0.6,
              ...t.shadows.md,
            })}
          >
            <Ionicons
              name="share-social-outline"
              size={18}
              color={t.colors.textOnPrimary}
              style={{ marginRight: t.space[2] }}
            />
            <Text
              style={{
                fontSize: t.typography.size.md,
                fontWeight: t.typography.weight.semibold,
                color: t.colors.textOnPrimary,
              }}
            >
              Share with Friends
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: t.typography.size.xs,
              color: t.colors.textTertiary,
              textAlign: "center",
              marginTop: t.space[3],
            }}
          >
            Share via WhatsApp, Telegram, or any other messaging app.
          </Text>
        </ScrollView>
      </ModalSafeArea>
    </Modal>
  );
}
