// TODO: Menna meka mama fix kara.

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { AuthServices } from "../Services/AuthService";
import { parseParam } from "../utils/Authhelpers";

// ======================= Constants ============================
const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const DEFAULT_PROMPT = "Enter the 6-digit code sent to your email.";

// ============================= Hook ============================================
export const useVerifyEmail = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    message?: string | string[];
  }>();

  // ========================= URL params ======================================
  const initialEmail = useMemo(() => parseParam(params.email), [params.email]);
  const initialMessage = useMemo(
    () => parseParam(params.message) || DEFAULT_PROMPT,
    [params.message]
  );

  // ============================ Form state ===============================
  const [email, setEmail] = useState(initialEmail);
  const [codeDigits, setCodeDigits] = useState<string[]>(
    Array(CODE_LENGTH).fill("")
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const code = codeDigits.join("");
  const isFormValid = email.trim().length > 0 && code.length === CODE_LENGTH;

  // ========================== Resend cooldown timer =====================
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(
      () => setResendCooldown((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // ============================= Verify mutation ===========================
  const verifyMutation = useMutation({
    mutationFn: () => AuthServices.VerifyEmail(email, code),
    onSuccess: (response) => {
      const message =
        response?.message ?? "Email verified successfully. You can sign in now.";
      router.replace({
        pathname: "/(auth)/LogInScreen",
        params: { email, message },
      });
    },
  });

  // ======================= Resend mutation ================================
  const resendMutation = useMutation({
    mutationFn: () => AuthServices.ResendEmailVerification(email),
    onSuccess: () => {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCodeDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    },
  });

  // ========================== Input handlers ============================
  const handleDigitChange = useCallback(
    (text: string, index: number) => {
      verifyMutation.reset();
      resendMutation.reset();

      const cleaned = text.replace(/[^0-9]/g, "");

      if (cleaned.length > 1) {
        const next = Array(CODE_LENGTH).fill("");
        cleaned
          .slice(0, CODE_LENGTH)
          .split("")
          .forEach((ch, i) => {
            next[i] = ch;
          });
        setCodeDigits(next);
        const lastFilled = Math.min(cleaned.length, CODE_LENGTH) - 1;
        inputRefs.current[lastFilled]?.focus();
        return;
      }

      const next = [...codeDigits];
      next[index] = cleaned;
      setCodeDigits(next);

      if (cleaned && index < CODE_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [codeDigits, verifyMutation, resendMutation]
  );

  const handleDigitKeyPress = useCallback(
    (key: string, index: number) => {
      if (key !== "Backspace") return;

      if (codeDigits[index]) {
        const next = [...codeDigits];
        next[index] = "";
        setCodeDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codeDigits]
  );

  // =========================== Action guards ========================
  const handleVerify = useCallback(() => {
    if (!isFormValid || verifyMutation.isPending) return;
    verifyMutation.mutate();
  }, [isFormValid, verifyMutation]);

  const handleResendCode = useCallback(() => {
    if (!email.trim() || resendCooldown > 0 || resendMutation.isPending) return;
    verifyMutation.reset();
    resendMutation.mutate();
  }, [email, resendCooldown, resendMutation, verifyMutation]);

  // ====================== Unified messages =========================
  const errorMessage =
    (verifyMutation.error as any)?.message ??
    (resendMutation.error as any)?.message ??
    null;

  const infoMessage = errorMessage
    ? null
    : resendMutation.isSuccess
    ? (resendMutation.data as any)?.message ?? DEFAULT_PROMPT
    : initialMessage;

  return {
    email,
    setEmail,
    codeDigits,
    code,
    isFormValid,
    focusedIndex,
    setFocusedIndex,
    inputRefs,


    handleDigitChange,
    handleDigitKeyPress,
    handleVerify,
    handleResendCode,


    loading: verifyMutation.isPending,
    resendLoading: resendMutation.isPending,
    resendCooldown,
    canResend: resendCooldown <= 0 && !resendMutation.isPending,
    errorMessage,
    infoMessage,
  };
};