import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/constants/theme";
import { useAuthStore } from "@/src/store/authStore";
import {
  useRequestDeleteAccount,
  useConfirmDeleteAccount,
} from "@/src/hooks/UseAccount";
import { useRouter } from "expo-router";

// ─── Types ──────────────────────────────────────────────────────────────────

type Theme = ReturnType<typeof useTheme>;
type Styles = ReturnType<typeof createStyles>;

// ─── Constants ───────────────────────────────────────────────────────────────

const DELETED_ITEMS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] =
  [
    { icon: "location-outline", text: "All location history and GPS data" },
    { icon: "people-outline", text: "Your family circles and memberships" },
    {
      icon: "phone-portrait-outline",
      text: "All linked GPS device connections",
    },
    {
      icon: "notifications-outline",
      text: "Notification settings and preferences",
    },
    { icon: "card-outline", text: "Subscription and billing records" },
    { icon: "person-outline", text: "Your profile and account credentials" },
  ];

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}****@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `****${digits.slice(-3)}`;
}

function extractErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message ?? err?.message ?? fallback;
}

// ─── StepIndicator ───────────────────────────────────────────────────────────

function StepIndicator({
  step,
  t,
  styles,
}: {
  step: 1 | 2;
  t: Theme;
  styles: Styles;
}) {
  const w1 = useRef(new Animated.Value(step === 1 ? 20 : 6)).current;
  const w2 = useRef(new Animated.Value(step === 2 ? 20 : 6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(w1, {
        toValue: step === 1 ? 20 : 6,
        useNativeDriver: false,
      }),
      Animated.spring(w2, {
        toValue: step === 2 ? 20 : 6,
        useNativeDriver: false,
      }),
    ]).start();
  }, [step, w1, w2]);

  return (
    <View style={styles.stepRow}>
      <Animated.View
        style={[
          styles.stepDot,
          {
            width: w1,
            backgroundColor: step === 1 ? t.colors.primary : t.colors.success,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.stepDot,
          {
            width: w2,
            backgroundColor: step === 2 ? t.colors.primary : t.colors.border,
          },
        ]}
      />
    </View>
  );
}

// ─── WarningBanner ───────────────────────────────────────────────────────────

function WarningBanner({ t, styles }: { t: Theme; styles: Styles }) {
  return (
    <View style={styles.warningBox}>
      <Ionicons
        name="warning-outline"
        size={18}
        color={t.colors.warning}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.warningTitle}>
          Warning — no data can be recovered
        </Text>
        <Text style={styles.warningBody}>
          Once deleted, your account and all data are permanently removed. We
          cannot restore anything after this action.
        </Text>
      </View>
    </View>
  );
}

// ─── DeletedItemsList ─────────────────────────────────────────────────────────

function DeletedItemsList({ t, styles }: { t: Theme; styles: Styles }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>WHAT WILL BE PERMANENTLY DELETED</Text>
      {DELETED_ITEMS.map(({ icon, text }, i) => (
        <View
          key={text}
          style={[
            styles.itemRow,
            i < DELETED_ITEMS.length - 1 && styles.itemBorder,
          ]}
        >
          <Ionicons name={icon} size={16} color={t.colors.error} />
          <Text style={styles.itemText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Step 1: Type DELETE ─────────────────────────────────────────────────────

function Step1({
  onNext,
  t,
  styles,
}: {
  onNext: () => void;
  t: Theme;
  styles: Styles;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const isValid = value === "DELETE";
  const hasError = touched && value.length > 0 && !isValid;
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.inputLabel}>
        Type <Text style={styles.codeSpan}>DELETE</Text> below to confirm
      </Text>
      <TextInput
        value={value}
        onChangeText={(txt) => {
          setValue(txt);
          setTouched(true);
        }}
        placeholder="Type DELETE here"
        autoCapitalize="characters"
        autoCorrect={false}
        spellCheck={false}
        style={[
          styles.textInput,
          hasError && styles.textInputError,
          isValid && styles.textInputValid,
        ]}
        placeholderTextColor={t.colors.textDisabled}
      />
      {hasError && (
        <Text style={styles.fieldError}>
          Please type DELETE exactly to proceed.
        </Text>
      )}

      <TouchableOpacity
        onPress={() => {
          if (isValid) onNext();
        }}
        disabled={!isValid}
        activeOpacity={0.8}
        style={[
          styles.btnPrimary,
          { backgroundColor: t.colors.primary, opacity: isValid ? 1 : 0.45 },
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={16}
          color={t.colors.textOnPrimary}
        />
        <Text style={styles.btnPrimaryText}>Continue to verification</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.btnOutline}
        activeOpacity={0.7}
      >
        <Text style={styles.btnOutlineText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function Step2({
  onDeleted,
  onBack,
  t,
  styles,
}: {
  onDeleted: () => void;
  onBack: () => void;
  t: Theme;
  styles: Styles;
}) {
  const user: any = useAuthStore((state) => state.user);
  const hasEmail = !!user?.email;
  const maskedContact = hasEmail
    ? maskEmail(user.email)
    : user?.phoneNumber
      ? maskPhone(user.phoneNumber)
      : "your registered contact";

  const [sent, setSent] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState(
    "Incorrect code. Please try again.",
  );

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutateAsync: requestDeleteAccount, isPending: sending } =
    useRequestDeleteAccount();
  const { mutateAsync: confirmDeleteAccount, isPending: deleting } =
    useConfirmDeleteAccount();

  const startTimer = useCallback(() => {
    setResendTimer(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((t2) => {
        if (t2 <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t2 - 1;
      });
    }, 1000);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const handleSend = async () => {
    try {
      await requestDeleteAccount();
      setSent(true);
      setDigits(Array(OTP_LENGTH).fill(""));
      setOtpError(false);
      startTimer();
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      Alert.alert(
        "Couldn't send code",
        extractErrorMessage(
          err,
          "Failed to send the verification code. Please try again.",
        ),
      );
    }
  };

  const handleDigit = (index: number, text: string) => {
    const digit = text.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setOtpError(false);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = digits.join("");
  const otpComplete = code.length === OTP_LENGTH;
  const handleDelete = async () => {
    if (!otpComplete) return;
    try {
      await confirmDeleteAccount(code);
      onDeleted();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        setOtpErrorMessage(
          extractErrorMessage(
            err,
            "Invalid or expired code. Please try again.",
          ),
        );
        setOtpError(true);
      } else {
        Alert.alert(
          "Error",
          extractErrorMessage(err, "Something went wrong. Please try again."),
        );
      }
    }
  };

  // — Send screen —
  if (!sent) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>VERIFY YOUR IDENTITY</Text>
        <Text style={styles.bodyText}>
          We&apos;ll send a one-time code to your registered email address to
          confirm it&apos;s you.
        </Text>

        <View style={styles.contactCard}>
          <Ionicons
            name={hasEmail ? "mail-outline" : "call-outline"}
            size={16}
            color={t.colors.textTertiary}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactCardLabel}>
              {hasEmail ? "EMAIL ADDRESS" : "PHONE NUMBER"}
            </Text>
            <Text style={styles.contactCardValue}>{maskedContact}</Text>
          </View>
          <Ionicons
            name="lock-closed-outline"
            size={13}
            color={t.colors.border}
          />
        </View>

        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.8}
          style={[
            styles.btnPrimary,
            {
              backgroundColor: t.colors.textPrimary,
              opacity: sending ? 0.7 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator color={t.colors.background} size="small" />
          ) : (
            <Ionicons
              name="send-outline"
              size={16}
              color={t.colors.background}
            />
          )}
          <Text style={[styles.btnPrimaryText, { color: t.colors.background }]}>
            {sending ? "Sending…" : "Send verification code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBack}
          style={styles.btnOutline}
          activeOpacity={0.7}
        >
          <Text style={styles.btnOutlineText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // — OTP entry screen —
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>ENTER VERIFICATION CODE</Text>
      <Text style={styles.bodyText}>
        Enter the 6-digit code sent to{" "}
        <Text style={{ fontWeight: "600", color: t.colors.textPrimary }}>
          {maskedContact}
        </Text>
      </Text>

      {/* OTP boxes */}
      <View style={styles.otpRow}>
        {digits.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            value={d}
            onChangeText={(txt) => handleDigit(i, txt)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            maxLength={1}
            keyboardType="number-pad"
            textAlign="center"
            style={[
              styles.otpBox,
              otpError && styles.otpBoxError,
              d && !otpError && styles.otpBoxFilled,
            ]}
          />
        ))}
      </View>

      {otpError && (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={t.colors.error}
          />
          <Text style={styles.fieldError}>{otpErrorMessage}</Text>
        </View>
      )}

      {/* Resend */}
      <View style={styles.resendRow}>
        <Text style={styles.resendTimer}>
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Didn't receive it?"}
        </Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={resendTimer > 0 || sending}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.resendBtn,
              (resendTimer > 0 || sending) && { color: t.colors.textDisabled },
            ]}
          >
            ↺ Resend code
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleDelete}
        disabled={!otpComplete || deleting}
        activeOpacity={0.8}
        style={[
          styles.btnDanger,
          (!otpComplete || deleting) && { opacity: 0.5 },
        ]}
      >
        {deleting ? (
          <ActivityIndicator color={t.colors.textOnPrimary} size="small" />
        ) : (
          <Ionicons
            name="trash-outline"
            size={16}
            color={t.colors.textOnPrimary}
          />
        )}
        <Text style={styles.btnPrimaryText}>
          {deleting ? "Deleting…" : "Permanently delete my account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onBack}
        style={styles.btnOutline}
        activeOpacity={0.7}
      >
        <Text style={styles.btnOutlineText}>Cancel — keep my account</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DeleteAccountScreen() {
  const t = useTheme();
  const styles = useMemo(() => createStyles(t), [t]);

  const [step, setStep] = useState<1 | 2>(1);
  const [deleted, setDeleted] = useState(false);

  // ── Success state ──
  if (deleted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color={t.colors.success}
            />
          </View>
          <Text style={styles.successTitle}>Account deleted successfully</Text>
          <Text style={styles.successBody}>
            Your account and all associated data have been permanently removed.
            You will receive a confirmation email shortly.
          </Text>
          <TouchableOpacity
            style={styles.successBtn}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert("Navigate", "Return to homepage");
            }}
          >
            <Text style={styles.successBtnText}>Return to homepage</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <StepIndicator step={step} t={t} styles={styles} />
            <View style={styles.iconBox}>
              <Ionicons
                name="person-remove-outline"
                size={26}
                color={t.colors.error}
              />
            </View>
            <Text style={styles.title}>Delete your account</Text>
            <Text style={styles.subtitle}>
              This will permanently delete your account and remove all
              associated data.{" "}
              <Text style={{ fontWeight: "600", color: t.colors.textPrimary }}>
                This action cannot be undone.
              </Text>
            </Text>
          </View>

          <WarningBanner t={t} styles={styles} />
          <DeletedItemsList t={t} styles={styles} />

          {step === 1 && (
            <Step1 onNext={() => setStep(2)} t={t} styles={styles} />
          )}
          {step === 2 && (
            <Step2
              onDeleted={() => setDeleted(true)}
              onBack={() => setStep(1)}
              t={t}
              styles={styles}
            />
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(t: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,
    },
    scroll: {
      paddingHorizontal: t.space[4],
      paddingTop: t.space[4],
    },

    // Header
    header: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius["2xl"],
      padding: t.space[6],
      marginBottom: t.space[3],
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    stepRow: {
      flexDirection: "row",
      gap: 4,
      marginBottom: t.space[5],
    },
    stepDot: {
      height: 6,
      borderRadius: 99,
    },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.errorBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[4],
    },
    title: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      marginBottom: 6,
      letterSpacing: t.typography.tracking.tight,
    },
    subtitle: {
      fontSize: t.typography.size.base,
      color: t.colors.textSecondary,
      lineHeight: t.typography.size.base * t.typography.leading.normal,
    },

    // Warning
    warningBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: t.colors.warningBg,
      borderWidth: 1,
      borderColor: t.colors.warning,
      borderRadius: t.radius.lg,
      padding: 14,
      marginBottom: t.space[3],
    },
    warningTitle: {
      fontSize: t.typography.size.sm,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.warningText,
      marginBottom: 3,
    },
    warningBody: {
      fontSize: t.typography.size.sm,
      color: t.colors.warningText,
      lineHeight: t.typography.size.sm * t.typography.leading.normal,
    },

    // Deleted items list
    section: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius["2xl"],
      padding: t.space[5],
      marginBottom: t.space[3],
      borderWidth: 1,
      borderColor: t.colors.border,
    },
    sectionLabel: {
      fontSize: t.typography.size.xs,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textTertiary,
      letterSpacing: t.typography.tracking.wide,
      marginBottom: t.space[3],
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
    },
    itemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: t.colors.divider,
    },
    itemText: {
      fontSize: t.typography.size.base,
      color: t.colors.textPrimary,
      flex: 1,
    },

    // Input
    inputLabel: {
      fontSize: t.typography.size.base,
      color: t.colors.textPrimary,
      marginBottom: t.space[2],
      lineHeight: t.typography.size.base * t.typography.leading.normal,
    },
    codeSpan: {
      fontFamily: t.typography.fontFamily.mono,
      backgroundColor: t.colors.backgroundAlt,
      color: t.colors.error,
      fontSize: t.typography.size.sm,
      paddingHorizontal: 4,
    },
    textInput: {
      height: 48,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      paddingHorizontal: 14,
      fontSize: t.typography.size.md,
      color: t.colors.textPrimary,
      backgroundColor: t.colors.surface,
      marginBottom: 4,
    },
    textInputError: {
      borderColor: t.colors.error,
      backgroundColor: t.colors.errorBg,
    },
    textInputValid: {
      borderColor: t.colors.success,
      backgroundColor: t.colors.successBg,
    },
    fieldError: {
      fontSize: t.typography.size.xs,
      color: t.colors.error,
      marginTop: 2,
      marginBottom: 4,
    },

    // Buttons
    btnPrimary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[2],
      height: 52,
      borderRadius: t.radius.lg,
      marginTop: 14,
    },
    btnPrimaryText: {
      fontSize: t.typography.size.md,
      fontWeight: t.typography.weight.semibold,
      color: t.colors.textOnPrimary,
    },
    btnDanger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[2],
      height: 52,
      borderRadius: t.radius.lg,
      backgroundColor: t.colors.error,
      marginTop: 14,
    },
    btnOutline: {
      height: 48,
      borderRadius: t.radius.lg,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
    },
    btnOutlineText: {
      fontSize: t.typography.size.sm,
      color: t.colors.textSecondary,
      fontWeight: t.typography.weight.medium,
    },

    // Contact card
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      backgroundColor: t.colors.backgroundAlt,
      borderWidth: 1,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      paddingHorizontal: 14,
      paddingVertical: t.space[3],
      marginTop: t.space[3],
      marginBottom: 4,
    },
    contactCardLabel: {
      fontSize: 10,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textTertiary,
      letterSpacing: 0.7,
      marginBottom: 2,
    },
    contactCardValue: {
      fontSize: t.typography.size.base,
      color: t.colors.textPrimary,
      fontFamily: t.typography.fontFamily.mono,
    },
    bodyText: {
      fontSize: t.typography.size.base,
      color: t.colors.textSecondary,
      lineHeight: t.typography.size.base * t.typography.leading.normal,
      marginBottom: 4,
    },

    // OTP
    otpRow: {
      flexDirection: "row",
      gap: t.space[2],
      marginTop: t.space[4],
      marginBottom: t.space[2],
    },
    otpBox: {
      flex: 1,
      aspectRatio: 1,
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radius.lg,
      fontSize: t.typography.size["2xl"],
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      backgroundColor: t.colors.surface,
    },
    otpBoxError: {
      borderColor: t.colors.error,
      backgroundColor: t.colors.errorBg,
      color: t.colors.error,
    },
    otpBoxFilled: {
      borderColor: t.colors.success,
      backgroundColor: t.colors.successBg,
    },
    errorRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    },
    resendRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: t.space[3],
    },
    resendTimer: {
      fontSize: t.typography.size.xs,
      color: t.colors.textTertiary,
    },
    resendBtn: {
      fontSize: t.typography.size.xs,
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
    },

    // Success
    successContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.space[8],
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: t.colors.successBg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: t.space[6],
    },
    successTitle: {
      fontSize: t.typography.size.xl,
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      textAlign: "center",
      marginBottom: t.space[3],
      letterSpacing: t.typography.tracking.tight,
    },
    successBody: {
      fontSize: t.typography.size.base,
      color: t.colors.textSecondary,
      textAlign: "center",
      lineHeight: t.typography.size.base * t.typography.leading.normal,
      marginBottom: t.space[8],
    },
    successBtn: {
      backgroundColor: t.colors.primary,
      paddingHorizontal: t.space[7],
      paddingVertical: t.space[4],
      borderRadius: t.radius.lg,
    },
    successBtnText: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.md,
    },
  });
}
