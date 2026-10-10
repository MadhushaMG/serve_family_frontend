import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuthStyles } from "./authStyles";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/constants/theme";
import { LogoPin } from "./LogInScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GoogleReferralModal from "@/src/components/modals/GoogleReferralModal";
import { useSignUp } from "@/src/hooks/Usesignup";
import { useSignIn } from "@/src/hooks/useSignIn";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;
  const authStyles = useAuthStyles();

  const {
    loading,
    errorMessage,
    email,
    focusedField,
    isFormValid,
    password,
    setEmail,
    setFocusedField,
    setPassword,
    setShowPassword,
    showPassword,
    name,
    setName,
    confirmPassword,
    setConfirmPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    referralCode,
    setReferralCode,
    handleRegister,
  } = useSignUp();

  const { handleAppleLogin, handleGoogleLogin, isGoogleLoading, isAppleLoading } = useSignIn();
  const [showGoogleRefModal, setShowGoogleRefModal] = useState(false);

  const onGoogleButtonPress = async () => {
    if (referralCode && referralCode.trim()) {
      handleGoogleLogin(referralCode.trim());
      return;
    }
    try {
      const storedCode = await AsyncStorage.getItem("pending_referral_code");
      if (storedCode) {
        handleGoogleLogin(storedCode);
        return;
      }
    } catch {}
    setShowGoogleRefModal(true);
  };

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
              Create your account
            </Text>
            <Text
              style={{
                fontSize: ty.size.sm,
                color: c.textTertiary,
                marginBottom: t.space[8],
              }}
            >
              It only takes a minute to get started
            </Text>

            {/* ── Form ─────────────────────────────────────────────────── */}
            <View style={{ marginBottom: t.space[3] }}>
              <Text style={authStyles.inputLabel}>Full Name</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "name" ? 1.5 : 1 },
                  focusedField === "name" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <Feather
                  name="user"
                  size={17}
                  color={focusedField === "name" ? c.primary : c.textTertiary}
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="John Doe"
                  placeholderTextColor={c.textTertiary}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={{ marginBottom: t.space[3] }}>
              <Text style={authStyles.inputLabel}>Email</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "email" ? 1.5 : 1 },
                  focusedField === "email" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={17}
                  color={focusedField === "email" ? c.primary : c.textTertiary}
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={c.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={{ marginBottom: t.space[3] }}>
              <Text style={authStyles.inputLabel}>Password</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "password" ? 1.5 : 1 },
                  focusedField === "password" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={17}
                  color={
                    focusedField === "password" ? c.primary : c.textTertiary
                  }
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Enter password"
                  placeholderTextColor={c.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={17}
                    color={c.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: t.space[3] }}>
              <Text style={authStyles.inputLabel}>Confirm Password</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  {
                    borderWidth: focusedField === "confirmPassword" ? 1.5 : 1,
                  },
                  focusedField === "confirmPassword" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={17}
                  color={
                    focusedField === "confirmPassword"
                      ? c.primary
                      : c.textTertiary
                  }
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Re-enter password"
                  placeholderTextColor={c.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                  returnKeyType="next"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={17}
                    color={c.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Referral code (optional) */}
            <View style={{ marginBottom: t.space[5] }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={authStyles.inputLabel}>Referral Code</Text>
                <Text style={{ fontSize: ty.size.xs, color: c.textTertiary }}>
                  Optional
                </Text>
              </View>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "referralCode" ? 1.5 : 1 },
                  focusedField === "referralCode" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <Feather
                  name="gift"
                  size={17}
                  color={
                    focusedField === "referralCode" ? c.primary : c.textTertiary
                  }
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Enter referral code"
                  placeholderTextColor={c.textTertiary}
                  value={referralCode}
                  onChangeText={(v) => setReferralCode(v.toUpperCase())}
                  onFocus={() => setFocusedField("referralCode")}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Feedback banner */}
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
                  backgroundColor: "transparent",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: ty.size.sm,
                    color: c.error,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Register button */}
            <TouchableOpacity
              style={{
                height: 50,
                borderRadius: t.radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFormValid ? c.primary : c.border,
              }}
              onPress={() => handleRegister()}
              disabled={loading || !isFormValid}
              activeOpacity={0.85}
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
                  Create account
                </Text>
              )}
            </TouchableOpacity>

            {/* ── Divider ──────────────────────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: t.space[6],
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: c.divider }}
              />
              <Text
                style={{
                  marginHorizontal: t.space[3],
                  fontSize: ty.size.xs,
                  color: c.textTertiary,
                }}
              >
                or sign up with
              </Text>
              <View
                style={{ flex: 1, height: 1, backgroundColor: c.divider }}
              />
            </View>

            {/* ── Social buttons ───────────────────────────────────────── */}
            <View style={{ gap: t.space[3] }}>
              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: t.radius.lg,
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: c.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: t.space[3],
                }}
                onPress={onGoogleButtonPress}
                disabled={loading || isGoogleLoading}
                activeOpacity={0.7}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={c.textPrimary} size="small" />
                ) : (
                  <>
                    <Image
                      source={require("../../src/assets/logo/googleLogo.png")}
                      style={{ width: 18, height: 18 }}
                      resizeMode="contain"
                    />
                    <Text
                      style={{
                        fontSize: ty.size.base,
                        fontWeight: ty.weight.medium,
                        color: c.textSecondary,
                      }}
                    >
                      Continue with Google
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={{
                    height: 48,
                    borderRadius: t.radius.lg,
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: c.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: t.space[3],
                  }}
                  onPress={handleAppleLogin}
                  disabled={loading || isAppleLoading}
                  activeOpacity={0.7}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator color={c.textPrimary} size="small" />
                  ) : (
                    <>
                      <AntDesign name="apple" size={18} color={c.textPrimary} />
                      <Text
                        style={{
                          fontSize: ty.size.base,
                          fontWeight: ty.weight.medium,
                          color: c.textSecondary,
                        }}
                      >
                        Continue with Apple
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  height: 48,
                  borderRadius: t.radius.lg,
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: c.border,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: t.space[3],
                }}
                onPress={() => router.push("/(auth)/MobileSignUp")}
                activeOpacity={0.7}
              >
                <MaterialIcons name="phone" size={18} color={c.textSecondary} />
                <Text
                  style={{
                    fontSize: ty.size.base,
                    fontWeight: ty.weight.medium,
                    color: c.textSecondary,
                  }}
                >
                  Continue with Phone
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: t.space[8],
              }}
            >
              <Text style={{ fontSize: ty.size.sm, color: c.textTertiary }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/LogInScreen")}
              >
                <Text
                  style={{
                    fontSize: ty.size.sm,
                    fontWeight: ty.weight.semibold,
                    color: c.primary,
                  }}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Google Referral Prompt Modal (Option B) */}
      <GoogleReferralModal
        visible={showGoogleRefModal}
        onClose={() => setShowGoogleRefModal(false)}
        onSubmit={(refCode) => {
          setShowGoogleRefModal(false);
          handleGoogleLogin(refCode);
        }}
        isLoading={isGoogleLoading}
      />
    </View>
  );
}
