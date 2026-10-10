import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React from "react";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStyles } from "./authStyles";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/src/constants/theme";
import { LogoPin } from "./LogInScreen";
import { LinearGradient } from "expo-linear-gradient";
import { useForgotPasswordReset } from "@/src/hooks/useForgotPasswordReset";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

export default function ForgotPasswordReset() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;
  const authStyles = useAuthStyles();

  const {
    newPassword,
    setNewPassword,
    retypePassword,
    setRetypePassword,
    showNewPassword,
    setShowNewPassword,
    showRetypePassword,
    setShowRetypePassword,
    loading,
    errorMessage,
    setErrorMessage,
    focusedField,
    setFocusedField,
    isFormValid,
    handleResetPassword,
    router,
  } = useForgotPasswordReset();

  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundAlt }}>
      {/* Background Decorations */}
      <LinearGradient
        colors={
          t.isDark
            ? ["rgba(26,111,212,0.20)", "rgba(52,168,41,0.08)", "transparent"]
            : ["rgba(26,111,212,0.13)", "rgba(52,168,41,0.05)", "transparent"]
        }
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 300 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? hp("5%") : 0}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.space[5],
              paddingBottom: t.space[10] + insets.bottom,
              paddingTop: t.space[3],
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {router.canGoBack() && (
              <TouchableOpacity
                style={authStyles.backButton}
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign name="arrow-left" size={16} color={c.textPrimary} />
              </TouchableOpacity>
            )}

            <View
              style={{
                alignItems: "center",
                marginTop: t.space[2],
                marginBottom: t.space[7],
              }}
            >
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: t.radius["2xl"],
                  backgroundColor: c.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: c.border,
                  marginBottom: t.space[4],
                  ...t.shadows.md,
                }}
              >
                <LogoPin />
              </View>

              <Text
                style={{ fontSize: ty.size["2xl"], fontWeight: ty.weight.bold }}
              >
                <Text style={{ color: c.primary }}>Serve</Text>
                <Text style={{ color: c.accent }}>Family</Text>
              </Text>
              <Text
                style={{
                  fontSize: ty.size.xs,
                  fontWeight: ty.weight.medium,
                  color: c.textTertiary,
                  textTransform: "uppercase",
                  marginTop: t.space[1],
                }}
              >
                Stay Connected · Stay Protected
              </Text>
            </View>

            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: t.radius["3xl"],
                padding: t.space[5],
                borderWidth: 1,
                borderColor: c.border,
                ...t.shadows.lg,
              }}
            >
              <Text
                style={{
                  fontSize: ty.size.xl,
                  fontWeight: ty.weight.bold,
                  color: c.textPrimary,
                  marginBottom: t.space[1],
                }}
              >
                Reset Password 🔑
              </Text>
              <Text
                style={{
                  fontSize: ty.size.sm,
                  color: c.textTertiary,
                  marginBottom: t.space[5],
                }}
              >
                Create a new password for your account.
              </Text>

              {/* New Password */}
              <View style={{ marginBottom: t.space[3] }}>
                <Text style={authStyles.inputLabel}>New Password</Text>
                <View
                  style={[
                    authStyles.inputContainerIcon,
                    focusedField === "newPassword" &&
                      authStyles.inputContainerIconFocused,
                  ]}
                >
                  <MaterialIcons
                    name="lock"
                    size={18}
                    color={
                      focusedField === "newPassword"
                        ? c.primary
                        : c.textTertiary
                    }
                    style={authStyles.icon}
                  />
                  <TextInput
                    style={authStyles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={c.textTertiary}
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      setErrorMessage(null);
                    }}
                    onFocus={() => setFocusedField("newPassword")}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Feather
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={18}
                      color={c.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={{ marginBottom: t.space[4] }}>
                <Text style={authStyles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    authStyles.inputContainerIcon,
                    focusedField === "retypePassword" &&
                      authStyles.inputContainerIconFocused,
                  ]}
                >
                  <MaterialIcons
                    name="lock"
                    size={18}
                    color={
                      focusedField === "retypePassword"
                        ? c.primary
                        : c.textTertiary
                    }
                    style={authStyles.icon}
                  />
                  <TextInput
                    style={authStyles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor={c.textTertiary}
                    value={retypePassword}
                    onChangeText={(v) => {
                      setRetypePassword(v);
                      setErrorMessage(null);
                    }}
                    onFocus={() => setFocusedField("retypePassword")}
                    onBlur={() => setFocusedField(null)}
                    secureTextEntry={!showRetypePassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowRetypePassword(!showRetypePassword)}
                  >
                    <Feather
                      name={showRetypePassword ? "eye-off" : "eye"}
                      size={18}
                      color={c.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {errorMessage && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: t.space[2],
                    backgroundColor: c.errorBg,
                    borderRadius: t.radius.lg,
                    padding: t.space[3],
                    marginBottom: t.space[4],
                    borderWidth: 1,
                    borderColor: c.error,
                  }}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color={c.error}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: ty.size.sm,
                      color: c.errorText,
                    }}
                  >
                    {errorMessage}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={{
                  height: 52,
                  borderRadius: t.radius.xl,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isFormValid ? c.primary : c.border,
                  ...(isFormValid ? t.shadows.md : {}),
                }}
                onPress={handleResetPassword}
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
                    Reset Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
