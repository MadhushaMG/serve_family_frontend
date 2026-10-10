// TODO: Menna meka mama fix kara.

import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {useAuthStore } from "../store/authStore";
import { AuthServices } from "../Services/AuthService";
import GoogleAuthService from "../utils/googleAuth";
import AppleAuthService from "../utils/appleAuth";
import {
    flushPendingFcmToken,
} from "../utils/permissions";
import { parseParam } from "../utils/Authhelpers";
import { UserServices } from "../Services/UserServices";



// ============================= Hook ==============================================
export const useSignIn = () => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const router = useRouter();

    // ================================== URL params =====================================
    const params = useLocalSearchParams<{
        email?: string | string[];
        message?: string | string[];
    }>();
    const initialEmail = useMemo(() => parseParam(params.email), [params.email]);
    const initialMessage = useMemo(
        () => parseParam(params.message),
        [params.message]
    );

    // ================================= Local state =============================================
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<
        "email" | "password" | null
    >(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const [needsVerification, setNeedsVerification] = useState(false);

    const isFormValid =
        email.trim().length > 0 && password.trim().length > 0;

    useEffect(() => {
        GoogleAuthService.configure();
    }, []);

    useEffect(() => {
        if (initialEmail) setEmail(initialEmail);
    }, [initialEmail]);

    useEffect(() => {
        if (initialMessage) setInfoMessage(initialMessage);
    }, [initialMessage]);




    // ================= Shared post-auth navigation  ===========================
const storeTokensAndNavigate = useCallback(
    async (token: string, refreshToken: string, initialUser: any) => {
        useAuthStore.getState().setAuth({ accessToken: token, refreshToken }, initialUser);

        try {
            const response = await UserServices.GetProfile();
            
            if (response?.success && response?.data) {
                useAuthStore.getState().updateUser(response.data);
            }
        } catch (err) {
            console.warn("error loadign profile details:", err);
        }
        router.replace("/(Dashboard)/Mapsrceen");
        
        flushPendingFcmToken();
    },
    [router]
);

    // ========================== Email login mutation  =======================================
    const emailLoginMutation = useMutation({
        mutationFn: () => AuthServices.LoginWithEmail(email, password),
        onSuccess: async (response) => {
            if (response.token) {
                await storeTokensAndNavigate(
                    response.token,
                    response.refreshToken,
                    response.user
                );
                setPassword("");
            }
            else {
                emailLoginMutation.reset();
                throw new Error(
                    response?.data?.message ?? "Invalid credentials. Please try again."
                );
            }
        },
        onError: (error: any) => {
            if (
                error.message === "Email verification required. Please verify your email address before logging in."
            ) {
                setNeedsVerification(true);
                setInfoMessage("Please verify your email before logging in.");
            }
        },
    });

    const handleLogin = useCallback(() => {
        if (!email.trim() || !password.trim()) return;
        setNeedsVerification(false);
        setInfoMessage(null);
        emailLoginMutation.mutate();
    }, [email, password, emailLoginMutation]);

    // =============== Google login mutation  ===============================
    const googleLoginMutation = useMutation({
        mutationFn: (referralCode?: string | null) => GoogleAuthService.signIn(referralCode),
        onSuccess: async (response) => {
            if (!response) return;
            if (response.token && response.success) {
                await storeTokensAndNavigate(
                    response.token,
                    response.refreshToken,
                    response.user
                );
            }
        },
    });

    const handleGoogleLogin = useCallback((referralCode?: string | null) => {
        googleLoginMutation.mutate(referralCode);
    }, [googleLoginMutation]);

    // ===================  Apple login mutation  ====================================
    const appleLoginMutation = useMutation({
        mutationFn: () => AppleAuthService.signIn(),
        onSuccess: async () => {
            if (isAuthenticated) {
                router.replace("/(Dashboard)/Mapsrceen");
            }
        },
    });

    // ============================= Verification navigation  =============================
    const navigateToVerification = useCallback(() => {
        if (!email.trim()) return;
        router.push({ pathname: "/(auth)/VerifyEmailScreen", params: { email } });
    }, [email, router]);

    // ========================  Derived / unified error message ==========================
    const errorMessage =
        (emailLoginMutation.error as any)?.message ??
        (googleLoginMutation.error as any)?.message ??
        (appleLoginMutation.error as any)?.message ??
        null;

    const isEmailLoading = emailLoginMutation.isPending;
    const isGoogleLoading = googleLoginMutation.isPending;
    const isAppleLoading = appleLoginMutation.isPending;

    const loading =
        isEmailLoading ||
        isGoogleLoading ||
        isAppleLoading;

    return {
        // ============ Shared ==============
        storeTokensAndNavigate,
        loading,
        isEmailLoading,
        isGoogleLoading,
        isAppleLoading,
        errorMessage,
        infoMessage,

        // =================== Email sign-in ==============
        email,
        setEmail,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        focusedField,
        setFocusedField,
        isFormValid,
        needsVerification,
        handleLogin,
        navigateToVerification,

        // ================ Social ===============
        handleGoogleLogin: (referralCode?: string | null) => googleLoginMutation.mutate(referralCode),
        handleAppleLogin: () => appleLoginMutation.mutate(),
    };
};