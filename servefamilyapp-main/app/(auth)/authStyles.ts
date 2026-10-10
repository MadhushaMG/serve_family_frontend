import { StyleSheet } from "react-native";
import {useTheme} from "@/src/constants/theme";

/**
 * ServeFamily — Auth Styles
 *
 * Usage:
 *   const authStyles = useAuthStyles();
 *   <View style={authStyles.container}>
 */
export function useAuthStyles() {
  const t = useTheme();

  return StyleSheet.create({
    // ── Screens ──────────────────────────────────────────────────────────────
    container: {
      flex: 1,
      backgroundColor: t.colors.backgroundAlt,   // #F7F9FC light / #0D1220 dark
    },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: t.space[6],              // 24px
      paddingBottom: t.space[8],                  // 32px
      zIndex: 1,
    },

    // ── Back button ───────────────────────────────────────────────────────────
    backButton: {
      width: 40,
      height: 40,
      borderRadius: t.radius.full,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: t.space[5],                   // 20px
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.border,
      ...t.shadows.sm,
    },
    backButtonText: {
      color: t.colors.textPrimary,
      fontSize: t.typography.size["2xl"],         // 24sp
      fontWeight: t.typography.weight.regular,
    },

    // ── Header ───────────────────────────────────────────────────────────────
    header: {
      marginBottom: t.space[2],                   // 8px
      alignItems: "flex-start",
    },
    headerText: {
      fontSize: t.typography.size["2xl"],         // 24sp
      fontWeight: t.typography.weight.bold,
      color: t.colors.textPrimary,
      textAlign: "left",
      marginBottom: t.space[2],                   // 8px
      letterSpacing: t.typography.tracking.tight,
    },

    // ── Sub-header ───────────────────────────────────────────────────────────
    subHeaderContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: t.space[10],                  // 40px
    },
    subHeaderText: {
      fontSize: t.typography.size.sm,             // 12sp
      color: t.colors.textTertiary,
      fontWeight: t.typography.weight.medium,
    },
    subHeaderLink: {
      fontSize: t.typography.size.base,           // 14sp
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
      marginLeft: t.space[1],                     // 4px
    },

    // ── Form ─────────────────────────────────────────────────────────────────
    formContainer: {
      flex: 1,
    },
    inputGroup: {
      marginBottom: t.space[4],                   // 16px
    },

    // Input row with icon
    inputContainerIcon: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.xl,                  // 16px
      borderWidth: 1,
      borderColor: t.colors.border,
      height: 56,                                 // standard touch target
      paddingHorizontal: t.space[4],              // 16px
      ...t.shadows.sm,
    },
    inputContainerIconFocused: {
      borderColor: t.colors.borderFocus,
      borderWidth: 1.5,
    },
    icon: {
      marginRight: t.space[2],                    // 8px
      color: t.colors.textTertiary,
    },
    input: {
      flex: 1,
      height: "100%",
      fontSize: t.typography.size.base,           // 14sp
      color: t.colors.textPrimary,
    },
    inputLabel: {
      fontSize: t.typography.size.sm,             // 12sp
      fontWeight: t.typography.weight.medium,
      color: t.colors.textSecondary,
      marginBottom: t.space[1],                   // 4px
      marginLeft: t.space[1],
    },

    // ── Forgot password ───────────────────────────────────────────────────────
    forgotPasswordButton: {
      alignSelf: "center",
      marginTop: t.space[4],                      // 16px
      paddingVertical: t.space[1],
    },
    forgotPasswordText: {
      color: t.colors.primary,
      fontSize: t.typography.size.sm,             // 12sp
      fontWeight: t.typography.weight.medium,
    },

    // ── Bottom CTA area ───────────────────────────────────────────────────────
    bottomContainer: {
      marginTop: t.space[10],                     // 40px
    },

    // Primary button — inactive (no input yet)
    continueButton: {
      backgroundColor: t.colors.border,           // neutral grey
      borderRadius: t.radius.xl,                  // 16px
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: t.space[1],
    },
    // Primary button — active (has valid input)
    continueButtonActive: {
      backgroundColor: t.colors.primary,          // #1A6FD4 / #2979E8 dark
      borderRadius: t.radius.xl,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: t.space[1],
      ...t.shadows.md,
    },
    continueButtonText: {
      color: t.colors.textOnPrimary,              // always #fff
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.md,             // 15sp
      letterSpacing: t.typography.tracking.wide,
    },

    // Resend / secondary text button
    resendButton: {
      paddingVertical: t.space[3],                // 12px
      alignItems: "center",
      justifyContent: "center",
      marginTop: t.space[2],
    },
    resendButtonText: {
      color: t.colors.primary,
      fontSize: t.typography.size.base,           // 14sp
      fontWeight: t.typography.weight.semibold,
    },

    // Outline secondary button
    secondaryButton: {
      backgroundColor: "transparent",
      borderWidth: 1.5,
      borderColor: t.colors.border,
      borderRadius: t.radius.xl,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
    },
    secondaryButtonText: {
      color: t.colors.textPrimary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.md,             // 15sp
    },

    // Accent (green) button — e.g. "Create account"
    accentButton: {
      backgroundColor: t.colors.accent,           // #34A829
      borderRadius: t.radius.xl,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      ...t.shadows.md,
    },
    accentButtonText: {
      color: t.colors.textOnPrimary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.md,
      letterSpacing: t.typography.tracking.wide,
    },

    // ── Social sign-in ────────────────────────────────────────────────────────
    socialSection: {
      marginTop: t.space[12],                     // 48px
      alignItems: "center",
    },
    socialTextContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: t.space[6],                   // 24px
      width: "100%",
    },
    socialLine: {
      flex: 1,
      height: 1,
      backgroundColor: t.colors.divider,
    },
    socialText: {
      marginHorizontal: t.space[4],               // 16px
      color: t.colors.textTertiary,
      fontSize: t.typography.size.sm,             // 12sp
    },
    socialIconsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: t.space[6],                            // 24px
    },
    socialIconCircle: {
      width: 48,
      height: 48,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: t.colors.border,
      justifyContent: "center",
      alignItems: "center",
      ...t.shadows.sm,
    },

    // ── Sign-up row ───────────────────────────────────────────────────────────
    signUpContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: t.space[6],                      // 24px
    },
    signUpText: {
      color: t.colors.textTertiary,
      fontSize: t.typography.size.sm,             // 12sp
    },
    signUpLink: {
      color: t.colors.primary,
      fontWeight: t.typography.weight.semibold,
      fontSize: t.typography.size.sm,
      marginLeft: t.space[1],
    },

    // Phone sign-in link
    phoneSignInText: {
      color: t.colors.primary,
      textAlign: "center",
      fontSize: t.typography.size.base,           // 14sp
      fontWeight: t.typography.weight.medium,
      marginTop: t.space[4],
    },

    // ── Feedback messages ─────────────────────────────────────────────────────
    messageText: {
      textAlign: "center",
      fontSize: t.typography.size.sm,             // 12sp
      marginTop: t.space[3],                      // 12px
    },
    infoText: {
      color: t.colors.textTertiary,
    },
    errorText: {
      color: t.colors.error,                      // #DC2626 / #F87171 dark
      fontSize: t.typography.size.sm,
      marginTop: t.space[1],
      marginLeft: t.space[1],
    },
    successText: {
      color: t.colors.success,                    // #34A829 / #3DC42E dark
      fontSize: t.typography.size.sm,
      marginTop: t.space[1],
      marginLeft: t.space[1],
    },
  });
}

export default useAuthStyles;