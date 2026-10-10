import apiClient from "../api/apiClient"
import { AUTH_ENDPOINTS } from "../api/endpoints"

export const AuthServices = {
    async RefershToken(refreshToken: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH, { refreshToken: refreshToken })
        return response;
    },

    async GoogleLogin(idToken: string, referralCode?: string | null) {
        const response = await apiClient.post(AUTH_ENDPOINTS.GOOGLE_LOGIN, { idToken: idToken, referralCode: referralCode || null })
        return response;
    },

    async appleLogin(identityToken: string, user: {
        name: { firstName: string; lastName: string; };

    }, fcmToken: string | null, deviceId: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.APPLE_LOGIN, {
            identityToken: identityToken,
            user: {
                name: user.name,
            },
            fcmToken: fcmToken,
            deviceId: deviceId,
        });

        return response;
    },

    async RegisterWithEmail(email: string, password: string, name: string, referralCode: string | null) {
        const response = await apiClient.post(AUTH_ENDPOINTS.REGISTER, { email: email, referralCode: referralCode, password: password, name: name })
        return response;
    },

    async LoginWithEmail(email: string, password: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, { email: email, password: password })
        return response;
    },

    async VerifyEmail(email: string, code: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.VERIFY_EMAIL, { email: email, code: code });
        return response;
    },

    async ResendEmailVerification(email: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.RESEND_EMAIL_VERIFICATION, { email: email });
        return response;
    },

    async MobileNumberOtpSend(phoneNumber: string, name: string | null) {
        const response = await apiClient.post(AUTH_ENDPOINTS.MOBILE_NUMBER_SEND_OTP, { phoneNumber: phoneNumber, name: name })
        return response;
    },

    async VerifyMobileOtp(phoneNumber: string, code: string, name: string | null) {
        const response = await apiClient.post(AUTH_ENDPOINTS.MOBILE_NUMBER_VERIFY_OTP, { phoneNumber: phoneNumber, code: code, name: name })
        return response;
    },

    async ResendMobileOtp(phoneNumber: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.MOBILE_NUMBER_OTP_RESEND, { phoneNumber: phoneNumber })
        return response;
    },

    async LogOut(refreshToken: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.LOGOUT, { refreshToken: refreshToken })
        return response;
    },

    async ForgotPassword(email: string | null, phoneNumber: string | null) {
        const response = await apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email: email, phoneNumber: phoneNumber })
        return response;

    },

    async VerifyResetPasswordOtp(email: string | null, phoneNumber: string | null, code: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.VERIFY_RESET_PASSWORD_OTP, { email: email, phoneNumber: phoneNumber, code: code })
        return response;

    },

    async ResetPassword(resetId: string, newPassword: string) {
        const response = await apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, { resetId: resetId, newPassword: newPassword })
        return response;
    }

}