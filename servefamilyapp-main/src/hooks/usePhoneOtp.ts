// TODO: Menna meka mama fix kara.

import { useState, useEffect, useRef, useCallback } from "react";
import { TextInput } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { AuthServices } from "../Services/AuthService";
import { useSignIn } from "./useSignIn";

// ======================= Types ===================================
interface UsePhoneOtpProps {
  phoneNumber: string;
  name: string;
  codeLength: number;
  resendInterval: number;
}

// ================================= Hook ==========================
export const usePhoneOtp = ({
  phoneNumber,
  name,
  codeLength,
  resendInterval,
}: UsePhoneOtpProps) => {
  const { storeTokensAndNavigate } = useSignIn();

  // ========================= OTP digit state  ===============================
  const [codeDigits, setCodeDigits] = useState<string[]>(
    Array(codeLength).fill("")
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const code = codeDigits.join("");
  const isValid = code.length === codeLength;

  // ================================= Countdown timer ==========================
  const [secondsLeft, setSecondsLeft] = useState(resendInterval);


  useEffect(() => {
    setSecondsLeft(resendInterval);
  }, [phoneNumber, resendInterval]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(
      () => setSecondsLeft((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [secondsLeft]);

  // ====================================== Verify mutation =================================
  const verifyMutation = useMutation({
    mutationFn: () => AuthServices.VerifyMobileOtp( phoneNumber, code , name),
    onSuccess: async (res) => {
      if (res?.token) {
        await storeTokensAndNavigate(res.token, res.refreshToken, res.user);
      }
    },
  });

  // =============================== Resend mutation ===============================
  const resendMutation = useMutation({
    mutationFn: () => AuthServices.ResendMobileOtp(phoneNumber),
    onSuccess: (res) => {
      if (res?.success) {
        setSecondsLeft(resendInterval);
        setCodeDigits(Array(codeLength).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      }
    },
  });

  // ======================================= Input handlers =================================
  const handleDigitChange = useCallback(
    (text: string, index: number) => {
      verifyMutation.reset();

      const cleaned = text.replace(/[^0-9]/g, "");


      if (cleaned.length > 1) {
        const next = Array(codeLength).fill("");
        cleaned
          .slice(0, codeLength)
          .split("")
          .forEach((ch, i) => {
            next[i] = ch;
          });
        setCodeDigits(next);
        const lastIdx = Math.min(cleaned.length, codeLength) - 1;
        inputRefs.current[lastIdx]?.focus();
        return;
      }

      const next = [...codeDigits];
      next[index] = cleaned;
      setCodeDigits(next);

      if (cleaned && index < codeLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [codeDigits, codeLength, verifyMutation]
  );

  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === "Backspace" && !codeDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [codeDigits]
  );

  const handleVerify = useCallback(() => {
    if (!isValid || verifyMutation.isPending) return;
    verifyMutation.mutate();
  }, [isValid, verifyMutation]);

  const handleResend = useCallback(() => {
    if (secondsLeft > 0 || resendMutation.isPending) return;
    resendMutation.reset();
    verifyMutation.reset();
    resendMutation.mutate();
  }, [secondsLeft, resendMutation, verifyMutation]);

  // ====================== Unified messages ======================================
  const errorMessage =
    (verifyMutation.error as any)?.message ??
    (resendMutation.error as any)?.message ??
    null;

  const infoMessage = !errorMessage
    ? verifyMutation.isSuccess
      ? (verifyMutation.data as any)?.message ?? "Phone verified successfully."
      : resendMutation.isSuccess
      ? (resendMutation.data as any)?.message ?? "A new OTP has been sent."
      : null
    : null;

  return {
    codeDigits,
    focusedIndex,
    setFocusedIndex,
    inputRefs,
    isValid,
    handleDigitChange,
    handleKeyPress,

  
    handleVerify,
    handleResend,


    loading: verifyMutation.isPending,
    resendLoading: resendMutation.isPending,
    secondsLeft,
    canResend: secondsLeft <= 0 && !resendMutation.isPending,
    errorMessage,
    infoMessage,
  };
};