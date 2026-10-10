import { Router } from "express";
import { requireAuth } from "../middleware/auth"; 
import { getCircleSettings, updateCircleSettings } from "../controllers/notificationSettingController";

const router = Router();

router.get("/:circleId", requireAuth, getCircleSettings);

router.put("/:circleId", requireAuth, updateCircleSettings);

export default router;
