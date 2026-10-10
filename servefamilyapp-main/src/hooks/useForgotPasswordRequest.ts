// TODO: Menna meka mama fix kara.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { AuthServices } from '../Services/AuthService';


export const useForgotPasswordRequest = () => {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [focusedField, setFocusedField] = useState<"input" | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestReset = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const isEmail = trimmed.includes('@');
    let formattedInput = trimmed;

    if (!isEmail) {
      if (trimmed.startsWith('0')) {
        formattedInput = '+94' + trimmed.slice(1);
      } else if (!trimmed.startsWith('+')) {
        formattedInput = '+' + trimmed;
      }
    }

 

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await AuthServices.ForgotPassword(trimmed ,formattedInput );
      
      if (response.success) {
        router.push({
          pathname: '/(auth)/ForgotPasswordVerify',
          params: {
            contact: trimmed,
            isEmail: isEmail ? 'true' : 'false',
          }
        });
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return {
    input,
    setInput,
    focusedField,
    setFocusedField,
    loading,
    errorMessage,
    setErrorMessage,
    handleRequestReset,
    router
  };
};