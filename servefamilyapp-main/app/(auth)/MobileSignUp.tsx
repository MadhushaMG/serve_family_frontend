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
import CountryCodePicker from "../../src/components/CountryCodePicker";
import { useMobileAuth } from "@/src/hooks/Usemobileauth";
import { useSignIn } from "@/src/hooks/useSignIn";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";


export default function MobileSignUp() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;
  const authStyles = useAuthStyles();

  const {
    loading,
    errorMessage,
    infoMessage,
    focusedField,
    name,
    setFocusedField,
    setName,
    country,
    setCountry,
    mobileNumber,
    setMobileNumber,
    handleSendOtp,
    isMobileSignUpFormValid,
  } = useMobileAuth();

  const { handleAppleLogin, handleGoogleLogin } = useSignIn();

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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: t.space[8],
            }}
          >
            <Text style={{ fontSize: ty.size.sm, color: c.textTertiary }}>
              Prefer email?{" "}
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
                Sign up with email
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Full name ────────────────────────────────────────────── */}
          <View style={{ marginBottom: t.space[3] }}>
            <Text style={authStyles.inputLabel}>Full Name</Text>
            <View
              style={[
                authStyles.inputContainerIcon,
                { borderWidth: focusedField === "name" ? 1.5 : 1 },
                focusedField === "name" && authStyles.inputContainerIconFocused,
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

          {/* ── Phone input ──────────────────────────────────────────── */}
          <View style={{ marginBottom: t.space[3] }}>
            <Text style={authStyles.inputLabel}>Phone Number</Text>
            <View
              style={[
                authStyles.inputContainerIcon,
                { borderWidth: focusedField === "phone" ? 1.5 : 1 },
                focusedField === "phone" &&
                  authStyles.inputContainerIconFocused,
              ]}
            >
              <CountryCodePicker
                value={country}
                onChange={(selected) => setCountry(selected)}
              />
              <TextInput
                style={[authStyles.input, { flex: 1 }]}
                placeholder="712 345 678"
                placeholderTextColor={c.textTertiary}
                value={mobileNumber}
                onChangeText={(value) =>
                  setMobileNumber(value.replace(/[^0-9]/g, ""))
                }
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                editable={!loading}
                keyboardType="phone-pad"
                maxLength={15}
                returnKeyType="done"
              />
            </View>
          </View>

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

          {/* Send OTP button */}
          <TouchableOpacity
            style={{
              height: 50,
              borderRadius: t.radius.lg,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isMobileSignUpFormValid ? c.primary : c.border,
            }}
            onPress={() => handleSendOtp(true)}
            disabled={loading || !isMobileSignUpFormValid}
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
                Send OTP
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
            <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
            <Text
              style={{
                marginHorizontal: t.space[3],
                fontSize: ty.size.xs,
                color: c.textTertiary,
              }}
            >
              or sign up with
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
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.7}
            >
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
                {loading ? (
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
              onPress={() => router.push("/(auth)/MobileLogin")}
              activeOpacity={0.7}
            >
              <MaterialIcons name="login" size={18} color={c.textSecondary} />
              <Text
                style={{
                  fontSize: ty.size.base,
                  fontWeight: ty.weight.medium,
                  color: c.textSecondary,
                }}
              >
                Sign in with Phone
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
