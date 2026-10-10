// TODO: Menna meka mama fix kara.

import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthServices } from "../Services/AuthService";


export const useForgotPasswordVerify = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ contact: string; isEmail: string }>();

  const contact = Array.isArray(params.contact) ? params.contact[0] : params.contact;
  const isEmail = (Array.isArray(params.isEmail) ? params.isEmail[0] : params.isEmail) === "true";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<"code" | null>(null);

  const isFormValid = code.trim().length > 0;

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setErrorMessage('Please enter the reset code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);



    try {
      const response = await AuthServices.VerifyResetPasswordOtp( isEmail ? contact : null, isEmail ? null : contact, code.trim(),);

      if (response.success) {
        router.push({
          pathname: '/(auth)/ForgotPasswordReset',
          params: { resetId: response.resetId },
        });
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Error verifying reset code.');
    } finally {
      setLoading(false);
    }
  };

  return {
    contact,
    isEmail,
    code,
    setCode,
    loading,
    errorMessage,
    setErrorMessage,
    focusedField,
    setFocusedField,
    isFormValid,
    handleVerifyCode,
    router
  };
};