import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/src/constants/theme";
import { useAuthStyles } from "./authStyles";
import { useVerifyEmail } from "@/src/hooks/useVerifyEmail";
import { useRouter } from "expo-router";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";


const CODE_LENGTH = 6;

function ShieldIcon({
  size = 32,
  color = "#1A6FD4",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 12L11 14L15 10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function OtpBox({
  value,
  focused,
  hasError,
  t,
}: {
  value: string;
  focused: boolean;
  hasError: boolean;
  t: any;
}) {
  const c = t.colors;
  const ty = t.typography;
  return (
    <View
      style={{
        width: 46,
        height: 56,
        borderRadius: t.radius.lg,
        borderWidth: focused ? 1.5 : 1,
        borderColor: hasError
          ? c.error
          : focused
            ? c.primary
            : value
              ? c.borderStrong
              : c.border,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: ty.size.xl,
          fontWeight: ty.weight.bold,
          color: hasError ? c.error : c.textPrimary,
        }}
      >
        {value || ""}
      </Text>
      {focused && !value && (
        <View
          style={{
            width: 2,
            height: 22,
            backgroundColor: c.primary,
            borderRadius: 1,
          }}
        />
      )}
    </View>
  );
}

const VerifyEmailScreen = () => {
  const t = useTheme();
  const router = useRouter();
  const authStyles = useAuthStyles();
  const c = t.colors;
  const ty = t.typography;
  const insets = useSafeAreaInsets();

  const {
    email,
    setEmail,
    codeDigits,
    focusedIndex,
    setFocusedIndex,
    loading,
    resendLoading,
    resendCooldown,
    errorMessage,
    infoMessage,
    isFormValid,
    inputRefs,
    code,
    handleDigitChange,
    handleDigitKeyPress,
    handleVerify,
    handleResendCode,
  } = useVerifyEmail();

  return (
    <View style={{ flex: 1, backgroundColor: c.backgroundAlt }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? hp("5%") : 0}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: t.space[6],
            paddingTop: t.space[3] + insets.top,
            paddingBottom: t.space[8] + insets.bottom,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[authStyles.backButton, { marginBottom: t.space[6] }]}
            onPress={() => router.back()}
          >
            <AntDesign name="arrow-left" size={16} color={c.textPrimary} />
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: t.space[8],
            }}
          >
            <ShieldIcon size={28} color={c.primary} />
            <View style={{ marginLeft: t.space[3], flex: 1 }}>
              <Text
                style={{
                  fontSize: ty.size["2xl"],
                  fontWeight: ty.weight.bold,
                  color: c.textPrimary,
                  letterSpacing: ty.tracking.tight,
                }}
              >
                Verify your email
              </Text>
              <Text
                style={{
                  fontSize: ty.size.sm,
                  color: c.textTertiary,
                  marginTop: 2,
                }}
              >
                {infoMessage}
              </Text>
            </View>
          </View>

          {/* Email field */}
          <View style={{ marginBottom: t.space[6] }}>
            <Text style={authStyles.inputLabel}>Email</Text>
            <View style={[authStyles.inputContainerIcon, { borderWidth: 1 }]}>
              <MaterialIcons
                name="email"
                size={17}
                color={c.textTertiary}
                style={authStyles.icon}
              />
              <TextInput
                style={authStyles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading && !resendLoading}
              />
            </View>
          </View>

          {/* OTP section */}
          <Text style={[authStyles.inputLabel, { marginBottom: t.space[3] }]}>
            Verification code
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: t.space[1],
              marginBottom: t.space[5],
            }}
          >
            {codeDigits.map((digit, i) => (
              <View key={i} style={{ flex: 1 }}>
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[i] = ref;
                  }}
                  style={{
                    position: "absolute",
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                  }}
                  value={digit}
                  onChangeText={(text) => handleDigitChange(text, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleDigitKeyPress(nativeEvent.key, i)
                  }
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => inputRefs.current[i]?.focus()}
                >
                  <OtpBox
                    value={digit}
                    focused={focusedIndex === i}
                    hasError={!!errorMessage && code.length === CODE_LENGTH}
                    t={t}
                  />
                </TouchableOpacity>
              </View>
            ))}
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
              marginBottom: t.space[3],
            }}
            onPress={handleVerify}
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
                Verify Email
              </Text>
            )}
          </TouchableOpacity>

          {/* Resend button */}
          <TouchableOpacity
            style={{
              height: 46,
              borderRadius: t.radius.lg,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: t.space[2],
              borderWidth: 1,
              borderColor: resendCooldown > 0 ? c.border : c.primary,
            }}
            onPress={handleResendCode}
            disabled={resendLoading || loading || resendCooldown > 0}
          >
            {resendLoading ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <>
                <MaterialIcons
                  name="refresh"
                  size={16}
                  color={resendCooldown > 0 ? c.textTertiary : c.primary}
                />
                <Text
                  style={{
                    fontSize: ty.size.sm,
                    fontWeight: ty.weight.semibold,
                    color: resendCooldown > 0 ? c.textTertiary : c.primary,
                  }}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend Code"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              marginTop: t.space[8],
            }}
          >
            <Text style={{ color: c.textTertiary, fontSize: ty.size.sm }}>
              Ready to sign in?{" "}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: "/(auth)/LogInScreen",
                  params: { email },
                })
              }
            >
              <Text
                style={{
                  color: c.primary,
                  fontWeight: ty.weight.semibold,
                  fontSize: ty.size.sm,
                }}
              >
                Back to login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default VerifyEmailScreen;
