import { Router, json } from "express";
import { requireAuth } from "../middleware/auth";
import { subscribeToPlan, getCurrentPlan, getAllPlans } from "../controllers/subscriptionController";
import { ipayCallback } from "../controllers/paymentController";

const router = Router();

router.get("/subscription/plans", requireAuth, getAllPlans);
router.get("/subscription/current", requireAuth, getCurrentPlan);
router.post("/subscription/subscribe", requireAuth, json(), subscribeToPlan);

router.post("/payment/ipay-callback", json(), ipayCallback);

export default router;
