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
import { AntDesign } from "@expo/vector-icons";
import { useTheme } from "../../src/constants/theme";
import { LogoPin } from "./LogInScreen";
import { useForgotPasswordRequest } from "@/src/hooks/useForgotPasswordRequest";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";


export default function ForgotPasswordRequestScreen() {
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const c = t.colors;
  const ty = t.typography;
  const authStyles = useAuthStyles();

  const {
    input,
    setInput,
    focusedField,
    setFocusedField,
    loading,
    errorMessage,
    setErrorMessage,
    handleRequestReset,
    router,
  } = useForgotPasswordRequest();

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
              Forgot password
            </Text>
            <Text
              style={{
                fontSize: ty.size.sm,
                color: c.textTertiary,
                marginBottom: t.space[8],
              }}
            >
              Enter your email or mobile number to receive a reset code
            </Text>

            {/* ── Input ────────────────────────────────────────────────── */}
            <View style={{ marginBottom: t.space[5] }}>
              <Text style={authStyles.inputLabel}>Email OR Mobile Number</Text>
              <View
                style={[
                  authStyles.inputContainerIcon,
                  { borderWidth: focusedField === "input" ? 1.5 : 1 },
                  focusedField === "input" &&
                    authStyles.inputContainerIconFocused,
                ]}
              >
                <AntDesign
                  name="user"
                  size={17}
                  color={focusedField === "input" ? c.primary : c.textTertiary}
                  style={authStyles.icon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Email or Mobile Number"
                  placeholderTextColor={c.textTertiary}
                  value={input}
                  onChangeText={(v) => {
                    setInput(v);
                    setErrorMessage(null);
                  }}
                  onFocus={() => setFocusedField("input")}
                  onBlur={() => setFocusedField(null)}
                  autoCorrect={false}
                  autoCapitalize="none"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleRequestReset}
                />
              </View>

              {errorMessage && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: t.space[2],
                    borderRadius: t.radius.md,
                    paddingVertical: t.space[2],
                    paddingHorizontal: t.space[3],
                    marginTop: t.space[3],
                    borderLeftWidth: 2,
                    borderLeftColor: c.error,
                  }}
                >
                  <Text
                    style={{ flex: 1, fontSize: ty.size.sm, color: c.error }}
                  >
                    {errorMessage}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{
                height: 50,
                borderRadius: t.radius.lg,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: input.trim() ? c.primary : c.border,
              }}
              onPress={handleRequestReset}
              disabled={loading || !input.trim()}
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
                  Send Reset Code
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
