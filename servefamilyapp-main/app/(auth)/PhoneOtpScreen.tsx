import { useTheme } from "@/src/constants/theme";
import { usePhoneOtp } from "@/src/hooks/usePhoneOtp";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useAuthStyles } from "./authStyles";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";


const CODE_LENGTH = 6;
const RESEND_INTERVAL_S = 30;

// ── Phone icon component ─────────────────────────────────────────────────────
function PhoneIcon({
  size = 32,
  color = "#1A6FD4",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.6 10.8C7.8 13.2 9.8 15.2 12.2 16.4L14.2 14.4C14.5 14.1 14.9 14 15.3 14.2C16.5 14.6 17.8 14.8 19.2 14.8C19.8 14.8 20.4 15.4 20.4 16V19.2C20.4 19.8 19.8 20.4 19.2 20.4C10.6 20.4 3.6 13.4 3.6 4.8C3.6 4.2 4.2 3.6 4.8 3.6H8C8.6 3.6 9.2 4.2 9.2 4.8C9.2 6.2 9.4 7.5 9.8 8.7C9.9 9.1 9.8 9.5 9.6 9.8L6.6 10.8Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Single OTP box component ─────────────────────────────────────────────────
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
      {value ? (
        <Text
          style={{
            fontSize: ty.size.xl,
            fontWeight: ty.weight.bold,
            color: hasError ? c.error : c.textPrimary,
          }}
        >
          {value}
        </Text>
      ) : focused ? (
        <View
          style={{
            width: 2,
            height: 22,
            backgroundColor: c.primary,
            borderRadius: 1,
          }}
        />
      ) : null}
    </View>
  );
}

const parseParam = (v?: string | string[]) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

const PhoneOTPScreen = () => {
  const t = useTheme();
  const authStyles = useAuthStyles();
  const { colors: c, typography: ty, space, radius } = t;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    phoneNumber?: string;
    phonePrefix?: string;
    phoneDigits?: string;
    name?: string;
  }>();

  const phoneNumber = parseParam(params.phoneNumber);
  const name = parseParam(params.name);

  const {
    codeDigits,
    focusedIndex,
    loading,
    resendLoading,
    secondsLeft,
    errorMessage,
    infoMessage,
    inputRefs,
    isValid,
    canResend,
    handleDigitChange,
    handleKeyPress,
    handleVerify,
    handleResend,
    setFocusedIndex,
  } = usePhoneOtp({
    phoneNumber,
    name,
    codeLength: CODE_LENGTH,
    resendInterval: RESEND_INTERVAL_S,
  });

  const otpBoxes = useMemo(() => Array(CODE_LENGTH).fill(null), []);

  if (!phoneNumber) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.backgroundAlt,
          alignItems: "center",
          justifyContent: "center",
          padding: space[6],
        }}
      >
        <MaterialIcons
          name="error-outline"
          size={40}
          color={c.error}
          style={{ marginBottom: space[4] }}
        />
        <Text
          style={{
            fontSize: ty.size.lg,
            fontWeight: ty.weight.bold,
            color: c.textPrimary,
            textAlign: "center",
            marginBottom: space[5],
          }}
        >
          Missing phone number
        </Text>
        <TouchableOpacity
          style={{
            height: 50,
            width: "100%",
            borderRadius: radius.lg,
            backgroundColor: c.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.replace("/(auth)/MobileLogin")}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: ty.size.md,
              fontWeight: ty.weight.semibold,
            }}
          >
            Back to Phone Login
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            paddingHorizontal: space[6],
            paddingTop: space[3] + insets.top,
            paddingBottom: space[8] + insets.bottom,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[authStyles.backButton, { marginBottom: space[6] }]}
            onPress={() => router.back()}
          >
            <AntDesign name="arrow-left" size={16} color={c.textPrimary} />
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: space[8],
            }}
          >
            <PhoneIcon size={28} color={c.primary} />
            <View style={{ marginLeft: space[3] }}>
              <Text
                style={{
                  fontSize: ty.size["2xl"],
                  fontWeight: ty.weight.bold,
                  color: c.textPrimary,
                  letterSpacing: ty.tracking.tight,
                }}
              >
                Verify your phone
              </Text>
              <Text
                style={{
                  fontSize: ty.size.sm,
                  color: c.textTertiary,
                  marginTop: 2,
                }}
              >
                Code sent to {phoneNumber}
              </Text>
            </View>
          </View>

          <Text style={[authStyles.inputLabel, { marginBottom: space[3] }]}>
            Verification code
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: space[1],
              marginBottom: space[5],
            }}
          >
            {otpBoxes.map((_, i) => (
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
                    zIndex: 1,
                  }}
                  value={codeDigits[i]}
                  onChangeText={(text) => handleDigitChange(text, i)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, i)
                  }
                  onFocus={() => setFocusedIndex(i)}
                  onBlur={() => setFocusedIndex(null)}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!loading}
                />
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => inputRefs.current[i]?.focus()}
                >
                  <OtpBox
                    value={codeDigits[i]}
                    focused={focusedIndex === i}
                    hasError={!!errorMessage}
                    t={t}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {(errorMessage || infoMessage) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: space[2],
                borderRadius: radius.md,
                paddingVertical: space[2],
                paddingHorizontal: space[3],
                marginBottom: space[4],
                borderLeftWidth: 2,
                borderLeftColor: errorMessage ? c.error : c.primary,
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

          <TouchableOpacity
            style={{
              height: 50,
              borderRadius: radius.lg,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isValid ? c.primary : c.border,
              marginBottom: space[3],
            }}
            onPress={handleVerify}
            disabled={loading || !isValid}
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
                Verify Phone
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              height: 46,
              borderRadius: radius.lg,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: space[2],
              borderWidth: 1,
              borderColor: canResend ? c.primary : c.border,
            }}
            onPress={handleResend}
            disabled={!canResend}
          >
            {resendLoading ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <>
                <MaterialIcons
                  name="refresh"
                  size={16}
                  color={canResend ? c.primary : c.textTertiary}
                />
                <Text
                  style={{
                    fontSize: ty.size.sm,
                    fontWeight: ty.weight.semibold,
                    color: canResend ? c.primary : c.textTertiary,
                  }}
                >
                  {canResend ? "Resend Code" : `Resend in ${secondsLeft}s`}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PhoneOTPScreen;