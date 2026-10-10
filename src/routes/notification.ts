import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getNotifications, readNotification } from "../controllers/notificationController";

const router = Router();

// Get notifications for the authenticated user
router.get("/notifications", requireAuth, getNotifications);

// Mark a notification as read
router.put("/notifications/:notificationId", requireAuth, readNotification);

export default router;

