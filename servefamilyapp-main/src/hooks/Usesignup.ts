// TODO: Menna meka mama fix kara.

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { AuthServices } from "../Services/AuthService";

const MIN_PASSWORD_LENGTH = 6;

// ====================== Hook ====================================
export const useSignUp = () => {
  const router = useRouter();

  // ======================= Form state ===============================
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "name" | "email" | "password" | "confirmPassword" | "referralCode" | null
  >(null);

  // ========================= Client-side validation error (pre-submit) ===========================
  const [validationError, setValidationError] = useState<string | null>(null);

  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 ;

  const validate = (): boolean => {
    if (!name.trim()) {
      setValidationError("Please enter your name.");
      return false;
    }
    if (!email.trim()) {
      setValidationError("Please enter your email.");
      return false;
    }
    if (!password) {
      setValidationError("Please enter your password.");
      return false;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setValidationError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      );
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError("Passwords do not match.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  // ============================= Register mutation ====================================================
  const registerMutation = useMutation({
    mutationFn: () =>
      AuthServices.RegisterWithEmail(email, password, name, referralCode),
    onSuccess: (response) => {
      if (response?.success) {
        const message =
          response?.message ??
          "Account created. Check your email for the verification code.";
        router.replace({
          pathname: "/(auth)/VerifyEmailScreen",
          params: { email, message },
        });
      } else {
        throw new Error(
          response?.message ?? "Registration failed. Please try again."
        );
      }
    },
  });

  const handleRegister = () => {
    if (!validate()) return;
    registerMutation.mutate();
  };

  // ============================ Unified error (validation takes priority so the user fixes it first) =======================
  const errorMessage =
    validationError ??
    (registerMutation.error as any)?.message ??
    null;

  return {
    //============= Form fields ====================
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    referralCode,
    setReferralCode,
    focusedField,
    setFocusedField,

    //=============== State ===========
    isFormValid,
    loading: registerMutation.isPending,
    errorMessage,

    //========== Action ===========
    handleRegister,
  };
};