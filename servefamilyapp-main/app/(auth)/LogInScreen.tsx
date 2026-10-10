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
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GoogleReferralModal from "@/src/components/modals/GoogleReferralModal";
import { useSignIn } from "@/src/hooks/useSignIn";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";


export function LogoPin() {
  return (
    <Image
      source={require("../../src/assets/logo/logo-pin.png")}
      style={{ width: 32, height: 32 }}
      resizeMode="contain"
    />
  );
}

export default function LogInScreen() {
  const authStyles = useAuthStyles();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;

  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    focusedField,
    setFocusedField,
    needsVerification,
    isFormValid,
    loading,
    isEmailLoading,
    isGoogleLoading,
    isAppleLoading,
    errorMessage,
    infoMessage,
    handleLogin,
    navigateToVerification,
    handleAppleLogin,
    handleGoogleLogin,
  } = useSignIn();

  const [showGoogleRefModal, setShowGoogleRefModal] = useState(false);

  const onGoogleButtonPress = async () => {
    try {
      const storedCode = await AsyncStorage.getItem("pending_referral_code");
      if (storedCode) {
        handleGoogleLogin(storedCode);
        return;
      }
    } catch {}
    setShowGoogleRefModal(true);
  };

  const insets = useSafeAreaInsets();
  const router = useRouter();

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
            Welcome back
          </Text>
          <Text
            style={{
              fontSize: ty.size.sm,
              color: c.textTertiary,
              marginBottom: t.space[8],
            }}
          >
            Log in to continue to your account
          </Text>

          {/* ── Form ─────────────────────────────────────────────────── */}
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

          <View style={{ marginBottom: t.space[2] }}>
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
                color={focusedField === "password" ? c.primary : c.textTertiary}
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
                returnKeyType="done"
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

          <TouchableOpacity
            style={{ alignSelf: "flex-end", marginBottom: t.space[5] }}
            onPress={() => router.push("/(auth)/ForgotPasswordRequest")}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}
          >
            <Text
              style={{
                color: c.textSecondary,
                fontSize: ty.size.sm,
                fontWeight: ty.weight.medium,
              }}
            >
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Feedback banner */}
          {(infoMessage || errorMessage) && (
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
                borderLeftColor: errorMessage ? c.error : c.primary,
                backgroundColor: "transparent",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: ty.size.sm,
                  color: errorMessage ? c.error : c.textSecondary,
                }}
              >
                {errorMessage ?? infoMessage}
              </Text>
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={{
              height: 50,
              borderRadius: t.radius.lg,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isFormValid ? c.primary : c.border,
            }}
            onPress={handleLogin}
            disabled={loading || !isFormValid}
            activeOpacity={0.85}
          >
            {isEmailLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontSize: ty.size.md,
                  fontWeight: ty.weight.semibold,
                }}
              >
                Log in
              </Text>
            )}
          </TouchableOpacity>

          {needsVerification && (
            <TouchableOpacity
              style={{ marginTop: t.space[3], alignItems: "center" }}
              onPress={navigateToVerification}
            >
              <Text
                style={{
                  color: c.accent,
                  fontSize: ty.size.sm,
                  fontWeight: ty.weight.medium,
                }}
              >
                Verify your email →
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Divider ──────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: t.space[6],
            }}
          >
            <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
            <Text
              style={{
                marginHorizontal: t.space[3],
                fontSize: ty.size.xs,
                color: c.textTertiary,
              }}
            >
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
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
              disabled={loading}
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
                disabled={loading}
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
              disabled={loading}
              onPress={() => router.push("/(auth)/MobileLogin")}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="phone"
                size={18}
                color={c.textSecondary}
              />
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
              New here?{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/RegisterScreen")}
            >
              <Text
                style={{
                  fontSize: ty.size.sm,
                  fontWeight: ty.weight.semibold,
                  color: c.primary,
                }}
              >
                Create an account
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
