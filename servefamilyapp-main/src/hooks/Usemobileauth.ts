// TODO: Menna meka mama fix kara.

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthServices } from "../Services/AuthService";
import {
    Country,
    DEFAULT_COUNTRY,
} from "../components/CountryCodePicker";
import { parseParam, sanitizeDigits } from "../utils/Authhelpers";

//======================== Hook  ===============================
export const useMobileAuth = () => {
    const router = useRouter();

    // ============================== URL params ==========================
    const params = useLocalSearchParams<{
        phoneDigits?: string | string[];
        name?: string | string[];
    }>();

    // ====================== Form state  ============================================
    const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
    const [mobileNumber, setMobileNumber] = useState(() =>
        sanitizeDigits(parseParam(params.phoneDigits))
    );
    const [name, setName] = useState(parseParam(params.name));
    const [isFocused, setIsFocused] = useState(false);
    const [focusedField, setFocusedField] = useState<"name" | "phone" | null>(
        null
    );

    // ============================= Phone normalisation  ============================
    const normalizePhoneNumber = (prefix: string, rawNumber: string) => {
        const prefixDigits = sanitizeDigits(prefix);
        const normalizedPrefix = prefixDigits ? `+${prefixDigits}` : "";
        const normalizedNumber = sanitizeDigits(rawNumber).replace(/^0+/, "");
        const formattedNumber =
            normalizedPrefix && normalizedNumber
                ? `${normalizedPrefix}${normalizedNumber}`
                : "";
        return { normalizedPrefix, normalizedNumber, formattedNumber };
    };

    // ============================ Client-side validation error  ===========================================
    const [validationError, setValidationError] = useState<string | null>(null);

    const isMobileSignUpFormValid =
        name.trim().length > 0 && mobileNumber.trim().length >= 7;

    // ========================== OTP mutation (handles both sign-in and sign-up) ===========================
    const sendOtpMutation = useMutation({
        mutationFn: async ({ isSignUp }: { isSignUp: boolean }) => {
            const { normalizedPrefix, normalizedNumber, formattedNumber } =
                normalizePhoneNumber(country.code, mobileNumber);

            // ========================= Client-side guards ===============================
            if (isSignUp && !name.trim())
                throw new Error("Please enter your name.");
            if (!country)
                throw new Error("Please include your country code.");
            if (!normalizedNumber || normalizedNumber.length < 6)
                throw new Error("Enter a valid mobile number.");

            const response = isSignUp
                ? await AuthServices.MobileNumberOtpSend(formattedNumber, name.trim())
                : await AuthServices.MobileNumberOtpSend(formattedNumber, null);

            if (response?.data?.success === false) {
                throw new Error(
                    response.data.message ?? "Unable to send OTP. Please try again."
                );
            }

            return {
                response,
                meta: {
                    formattedNumber,
                    normalizedPrefix,
                    normalizedNumber,
                    isSignUp,
                },
            };
        },
        onSuccess: ({ response, meta }) => {
            setValidationError(null);
            router.push({
                pathname: "/(auth)/PhoneOtpScreen",
                params: {
                    phoneNumber: meta.formattedNumber,
                    phonePrefix: meta.normalizedPrefix,
                    phoneDigits: meta.normalizedNumber,
                    ...(meta.isSignUp && { name: name.trim() }),
                },
            });
        },
        onError: (error: any) => {
            setValidationError(error.message ?? null);
        },
    });

    const handleSendOtp = (isSignUp: boolean = false) => {
        setValidationError(null);
        sendOtpMutation.mutate({ isSignUp });
    };

    const errorMessage =
        validationError ??
        (sendOtpMutation.error as any)?.message ??
        null;

    const infoMessage =
        !sendOtpMutation.isError
            ? (sendOtpMutation.data?.response?.data?.message ?? null)
            : null;

    return {
        country,
        setCountry,
        mobileNumber,
        setMobileNumber,
        name,
        setName,
        isFocused,
        setIsFocused,
        focusedField,
        setFocusedField,

      
        isMobileSignUpFormValid,
        loading: sendOtpMutation.isPending,
        errorMessage,
        infoMessage,


        handleSendOtp,
    };
};