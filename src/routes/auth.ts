import { Router, json } from "express";
import {
  devLogin, refreshToken, logout, googleLogin, appleLogin, register,
  login, verifyEmail, resendEmailVerification, sendPhoneOTP,
  verifyPhoneOTP, resendPhoneOTP, requestPasswordReset,
  verifyPasswordResetCode, resetPassword
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { updateFirebaseToken } from "../services/notificationService";
import qrRoutes from "./qrRoutes";


import { requestAccountDeletion, confirmAccountDeletion } from "../controllers/authController";

import { getMyReferralStats, claimReferral } from "../controllers/userController";

const router = Router();

router.use("/qr", qrRoutes);
router.post("/auth/dev-login", json(), devLogin);
router.post("/auth/refresh", json(), refreshToken);
router.post("/auth/logout", json(), logout);
router.post("/auth/google", json(), googleLogin);
router.post("/auth/apple", json(), appleLogin);
router.post("/auth/register", json(), register);
router.post("/auth/login", json(), login);
router.post("/auth/verify-email", json(), verifyEmail);
router.post("/auth/resend-email-verification", json(), resendEmailVerification);
router.post("/auth/phone/send-otp", json(), sendPhoneOTP);
router.post("/auth/phone/verify-otp", json(), verifyPhoneOTP);
router.post("/auth/phone/resend-otp", json(), resendPhoneOTP);
router.post("/auth/password/request-reset", json(), requestPasswordReset);
router.post("/auth/password/verify-code", json(), verifyPasswordResetCode);
router.post("/auth/password/reset", json(), resetPassword);
router.get("/user/referral-stats", requireAuth, getMyReferralStats);

// Account Deletion Routes
router.post("/auth/request-delete-account", json(), requireAuth, requestAccountDeletion);
router.post("/auth/confirm-delete-account", json(), requireAuth, confirmAccountDeletion);

router.post("/user/claim-referral", requireAuth, json(), claimReferral);

router.post("/auth/firebase-token", requireAuth, json(), async (req: any, res) => {
  try {
    const token = req.body.token || req.body.fcmToken || req.body.fcm_token;
    const deviceId = req.body.deviceId || req.body.device_id || 'mobile_app';
    const userId = req.user?.userId;

    console.log(`📱 [FCM API] Request received for User: ${userId}`);
    console.log(`🔑 [FCM API] Token Found: ${token ? "YES" : "NO"}`);

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not identified" });
    }

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    await updateFirebaseToken(userId, token, deviceId);

    console.log(`✅ [FCM API] Token successfully updated for User: ${userId}`);
    res.json({ success: true, message: "Token updated" });
  } catch (error: any) {
    console.error(`❌ [FCM API] Error:`, error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
