import { Router } from "express";
import { requireAuth } from "../middleware/auth";

import { updateQrSettings, getPublicQrPage } from "../controllers/qrController"; 

const router = Router();

router.put('/settings', requireAuth, updateQrSettings);


router.get('/view/:code', getPublicQrPage); 

export default router;
