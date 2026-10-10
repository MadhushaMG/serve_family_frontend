import { Router } from "express";
import {
  getTrackerData,
  getTrackerDataByDeviceId,
  getDeviceIds,
  addUserDevice,
  getUserDevices,
  removeUserDevice,
  getDeviceLiveStatus,
  updateDeviceInCircle,
  removeDeviceFromCircle,
} from "../controllers/trackerController";
import { markNotificationAsRead } from '../controllers/deviceController';
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/tracker", getTrackerData);
router.get("/tracker/device/:deviceId", getTrackerDataByDeviceId);
router.get("/tracker/devices", getDeviceIds);

router.post("/tracker/user/devices", requireAuth, addUserDevice);
router.get("/tracker/user/devices", requireAuth, getUserDevices);
router.get("/tracker/user/devices/:deviceId/live", requireAuth, getDeviceLiveStatus);
router.delete("/tracker/user/devices/:deviceId", requireAuth, removeUserDevice);

router.put("/circles/:id/devices/:deviceId", requireAuth, updateDeviceInCircle);
router.delete("/circles/:id/devices/:deviceId", requireAuth, removeDeviceFromCircle);

router.patch('/devices/:deviceId/read', requireAuth, markNotificationAsRead);

router.put('/notifications/read-all', requireAuth, markNotificationAsRead);
router.put('/notifications/device/:deviceId/read', requireAuth, markNotificationAsRead);
export default router;
