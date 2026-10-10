import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import React from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStyles } from "./authStyles";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/constants/theme";
import { LogoPin } from "./LogInScreen";
import { useForgotPasswordVerify } from "@/src/hooks/useForgotPasswordVerify";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

export default function ForgotPasswordVerify() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;
  const authStyles = useAuthStyles();

  const {
    contact,
    isEmail,
    code,
    setCode,
    loading,
    errorMessage,
    setErrorMessage,
    focusedField,
    setFocusedField,
    isFormValid,
    handleVerifyCode,
    router,
  } = useForgotPasswordVerify();

  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundAlt }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? hp("5%") : 0}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: t.space[6],
              paddingBottom: t.space[8] + insets.bottom,
              paddingTop: t.space[3],
              justifyContent: "center",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            {router.canGoBack() && (
              <TouchableOpacity
                style={[authStyles.backButton, { marginBottom: t.space[6] }]}
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="arrow-left" size={16} color={c.textPrimary} />
              </TouchableOpacity>
            )}

            {/* ── Brand block ──────────────────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: t.space[8],
                gap: 3,
              }}
            >
              <LogoPin />
              <Text
                style={{
                  fontSize: ty.size["xl"],
                  fontWeight: ty.weight.bold,
                  letterSpacing: ty.tracking.tight,
                }}
              >
                <Text style={{ color: c.primary }}>Serve</Text>
                <Text style={{ color: c.accent }}>Family</Text>
              </Text>
            </View>

            {/* ── Heading ──────────────────────────────────────────────── */}
            <Text
              style={{
                fontSize: ty.size["2xl"],
                fontWeight: ty.weight.bold,
                color: c.textPrimary,
                letterSpacing: ty.tracking.tight,
                marginBottom: t.space[1],
              }}
            >
              Verify code
            </Text>
            <Text
              style={{
                fontSize: ty.size.sm,
                color: c.textTertiary,
                marginBottom: t.space[8],
              }}
            >
              Enter the code sent to your {isEmail ? "email" : "phone"}
            </Text>

            {/* ── Read-only contact ────────────────────────────────────── */}
            <View style={{ marginBottom: t.space[3] }}>
              <Text style={authStyles.inputLabel}>
                {isEmail ? "Email" : "Phone"}
              </Text>
              <View style={[authStyles.inputContainerIcon, { borderWidth: 1 }]}>
                <MaterialIcons
                  name={isEmail ? "email" : "phone"}
                  size={17}
                  color={c.textTertiary}
                  style={authStyles.icon}
                />
                <TextInput
                  style={[authStyles.input, { opacity: 0.6 }]}
                  value={contact}
                  editable={false}
                />
              </View>
            </View>

            {/* ── Code input ───────────────────────────────────────────── */}
            <View style={{ marginBottom: t.space[5] }}>
              <Text style={authStyles.inputLabel}>Reset Code</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "code" ? 1.5 : 1 },
                  focusedField === "code" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <Ionicons
                  name="key-outline"
                  size={17}
                  color={focusedField === "code" ? c.primary : c.textTertiary}
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="ABC 123"
                  placeholderTextColor={c.textTertiary}
                  value={code}
                  onChangeText={(v) => {
                    setCode(v);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("code")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Error message */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: t.space[2],
                  borderRadius: t.radius.md,
                  paddingVertical: t.space[2],
                  paddingHorizontal: t.space[3],
                  marginBottom: t.space[4],
                  borderLeftWidth: 2,
                  borderLeftColor: c.error,
                }}
              >
                <Text style={{ flex: 1, fontSize: ty.size.sm, color: c.error }}>
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={{
                height: 50,
                borderRadius: t.radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFormValid ? c.primary : c.border,
              }}
              onPress={handleVerifyCode}
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: ty.size.md,
                    fontWeight: ty.weight.semibold,
                  }}
                >
                  Verify Code
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
