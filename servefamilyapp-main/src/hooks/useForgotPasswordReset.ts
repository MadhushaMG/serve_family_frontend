// TODO: Menna meka mama fix kara.
import { useState } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthServices } from "../Services/AuthService";

export const useForgotPasswordReset = () => {
  const params = useLocalSearchParams<{ resetId: string }>();
  const router = useRouter();

  const resetId = Array.isArray(params.resetId)
    ? params.resetId[0]
    : params.resetId;

  const [newPassword, setNewPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"newPassword" | "retypePassword" | null>(null);

  const isFormValid = newPassword.trim().length > 0 && retypePassword.trim().length > 0;

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !retypePassword.trim()) {
      setErrorMessage('Please enter and confirm your new password.');
      return;
    }

    if (newPassword !== retypePassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await AuthServices.ResetPassword(resetId, newPassword);

      if (response.success) {
        Alert.alert(
          "Success",
          "Your password has been reset successfully. Please log in with your new password.",
          [{ text: "OK", onPress: () => router.replace('/(auth)/LogInScreen') }]
        );
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    newPassword,
    setNewPassword,
    retypePassword,
    setRetypePassword,
    showNewPassword,
    setShowNewPassword,
    showRetypePassword,
    setShowRetypePassword,
    loading,
    errorMessage,
    setErrorMessage,
    focusedField,
    setFocusedField,
    isFormValid,
    handleResetPassword,
    router
  };
};