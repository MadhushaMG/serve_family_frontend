import { Router } from "express";
import { getLogs } from "../controllers/logController";

const router = Router();

// Get API logs (unprotected)
router.get("/logs", getLogs);

export default router;
