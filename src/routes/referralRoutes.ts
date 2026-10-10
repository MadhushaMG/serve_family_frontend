import { Router } from "express";
import { generateReferralLink, getReferrerDetails } from "../controllers/referralController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/generate", requireAuth, generateReferralLink);
router.get("/details/:code", getReferrerDetails);

export default router;
