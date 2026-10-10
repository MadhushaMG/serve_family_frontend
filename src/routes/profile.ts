import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getProfile,
  updateProfile,
  storeFirebaseToken,
  getPendingMembershipRequests,
  getAssignedLocations,
  updateCurrentLocation,
  getLocationHistory,
  sendHeartbeat,
  sendSOSAlert,
  updateBatteryLevel,
  reportCrash,
  sendLowBatteryAlert,
} from "../controllers/profileController";
import { generateReferralLink, getReferrerDetails } from "../controllers/referralController";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname) || "";
    const userId = req.user?.userId || "anon";
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, upload.single("profileImage"), updateProfile);
router.post("/profile/firebase-token", requireAuth, storeFirebaseToken);
router.get("/profile/pending-requests", requireAuth, getPendingMembershipRequests);
router.get("/profile/assigned-locations", requireAuth, getAssignedLocations);
router.post("/profile/circles/:circleId/location", requireAuth, updateCurrentLocation);
router.get("/profile/location-history", requireAuth, getLocationHistory);
router.post("/profile/heartbeat", requireAuth, sendHeartbeat);
router.post("/profile/sos", requireAuth, sendSOSAlert);
router.post("/profile/battery", requireAuth, updateBatteryLevel);
router.post("/profile/crash", requireAuth, reportCrash);
router.post("/profile/low-battery", requireAuth, sendLowBatteryAlert);

router.post("/referral/generate", requireAuth, generateReferralLink);
router.get("/referral/details/:code", getReferrerDetails);

export default router;
