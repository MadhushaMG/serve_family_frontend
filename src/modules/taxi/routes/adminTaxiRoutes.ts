import { Router, json } from "express";
import { requireAuth, requireAdmin, requireAdminOrAgent } from "../../../middleware/auth";
import { getBookingReceipt } from "../controllers/taxiController";
import {
  adminGetAllVehicles,
  adminApproveVehicle,
  adminRejectVehicle,
  adminSuspendVehicle,
  adminGetStats,
  adminGetVehicleById,
  adminGetAgents,
  adminCreateAgent,
  adminUpdateAgent,
  adminDeleteAgent,
  adminResendAgentCredentials,
  adminAssignDriversToAgent,
  adminAutoAssignDrivers,
  adminGetAllUsers,
  adminUpdateUser,
  adminDeleteUser,
  adminResetUserPassword,
  adminGetPlans,
  adminUpdatePlan,
  adminGetSubscriptions,
  adminGetReferrals,
  adminBanUser,
  adminGetAllCircles,
  adminGetAdmins,
  adminCreateAdmin,
  adminDeleteAdmin,
  adminCreateVehicleByAgent,
  adminGetVehicleTypes,
  adminCreateVehicleType,
  adminUpdateVehicleType,
  adminDeleteVehicleType,
  adminGetSystemSettings,
  adminUpdateSystemSettings,
  adminGetAuditLogs,
  adminGetAllBookings,
  adminGetBookingDetails,
  adminCancelBooking,
  adminUpdateBookingStatus,
  adminReassignBooking,
  adminUpdateBookingDetails,
  adminSendBookingReceiptEmail,
  adminGetWalletsAndEarnings,
  adminSendBroadcastNotification,
  adminGetAudienceCounts,
  adminDeleteVehicle,
  adminUpdateVehicleAndDriver,
  adminUpdateVehicleWaiting,
  adminUploadDocument,
  adminGetCoverageZones,
  adminUpdateCoverageZones,
  adminToggleCoverageZone,
  adminQuickLookupVehicle,
  adminQuickApproveVehicle,
  adminToggleVehicleStatus,
} from "../controllers/adminTaxiController";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const docStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const handleDocUpload = (req: any, res: any, next: any) => {
  uploadDoc.any()(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// GET /api/admin/taxi/stats
router.get("/stats", requireAuth, requireAdminOrAgent, adminGetStats);
router.get("/audience-counts", requireAuth, requireAdmin, adminGetAudienceCounts);

// ================= SYSTEM SETTINGS & AUDIT LOGS =================
router.get("/settings", requireAuth, requireAdmin, adminGetSystemSettings);
router.patch("/settings", requireAuth, requireAdmin, json(), adminUpdateSystemSettings);
router.get("/audit-logs", requireAuth, requireAdmin, adminGetAuditLogs);

// ================= SRI LANKA COVERAGE ZONES =================
router.get("/coverage-zones", requireAuth, requireAdminOrAgent, adminGetCoverageZones);
router.put("/coverage-zones", requireAuth, requireAdmin, json(), adminUpdateCoverageZones);
router.post("/coverage-zones", requireAuth, requireAdmin, json(), adminUpdateCoverageZones);
router.post("/coverage-zones/toggle", requireAuth, requireAdmin, json(), adminToggleCoverageZone);

// ================= TRIPS & BOOKINGS =================
router.get("/bookings", requireAuth, requireAdminOrAgent, adminGetAllBookings);
router.get("/trips", requireAuth, requireAdminOrAgent, adminGetAllBookings);
router.get("/rides", requireAuth, requireAdminOrAgent, adminGetAllBookings);
router.get("/bookings/:id/receipt", requireAuth, requireAdminOrAgent, getBookingReceipt);
router.get("/bookings/:id/bill", requireAuth, requireAdminOrAgent, getBookingReceipt);
router.get("/receipts/:id", requireAuth, requireAdminOrAgent, getBookingReceipt);
router.get("/bills/:id", requireAuth, requireAdminOrAgent, getBookingReceipt);
router.get("/bookings/:id", requireAuth, requireAdminOrAgent, adminGetBookingDetails);
router.post("/bookings/:id/cancel", requireAuth, requireAdminOrAgent, json(), adminCancelBooking);
router.patch("/bookings/:id/status", requireAuth, requireAdminOrAgent, json(), adminUpdateBookingStatus);
router.post("/bookings/:id/status", requireAuth, requireAdminOrAgent, json(), adminUpdateBookingStatus);
router.patch("/bookings/:id/reassign", requireAuth, requireAdminOrAgent, json(), adminReassignBooking);
router.post("/bookings/:id/reassign", requireAuth, requireAdminOrAgent, json(), adminReassignBooking);
router.patch("/bookings/:id", requireAuth, requireAdminOrAgent, json(), adminUpdateBookingDetails);
router.post("/bookings/:id/send-receipt", requireAuth, requireAdminOrAgent, json(), adminSendBookingReceiptEmail);
router.post("/bookings/:id/email-receipt", requireAuth, requireAdminOrAgent, json(), adminSendBookingReceiptEmail);

// ================= WALLETS & EARNINGS =================
router.get("/wallets", requireAuth, requireAdmin, adminGetWalletsAndEarnings);
router.get("/earnings", requireAuth, requireAdmin, adminGetWalletsAndEarnings);
router.get("/driver-earnings", requireAuth, requireAdmin, adminGetWalletsAndEarnings);

// ================= BROADCAST NOTIFICATIONS =================
router.post("/notifications/broadcast", requireAuth, requireAdmin, json(), adminSendBroadcastNotification);

// GET /api/admin/taxi/vehicles
router.get("/vehicles", requireAuth, requireAdminOrAgent, adminGetAllVehicles);

// Instant Agent & Admin lookup & approval by mobile number or registration plate
router.get("/vehicles/lookup", requireAuth, requireAdminOrAgent, adminQuickLookupVehicle);
router.post("/vehicles/quick-approve", requireAuth, requireAdminOrAgent, json(), adminQuickApproveVehicle);

router.patch("/vehicles/:id", requireAuth, requireAdminOrAgent, json(), adminUpdateVehicleAndDriver);
router.patch("/vehicles/:id/waiting", requireAuth, requireAdminOrAgent, json(), adminUpdateVehicleWaiting);
router.patch("/vehicles/:id/toggle-waiting", requireAuth, requireAdminOrAgent, json(), adminUpdateVehicleWaiting);
router.patch("/vehicles/:id/status", requireAuth, requireAdminOrAgent, json(), adminToggleVehicleStatus);
router.patch("/vehicles/:id/toggle-status", requireAuth, requireAdminOrAgent, json(), adminToggleVehicleStatus);
router.patch("/vehicles/:id/toggle-online", requireAuth, requireAdminOrAgent, json(), adminToggleVehicleStatus);
router.post("/vehicles/:id/toggle-online", requireAuth, requireAdminOrAgent, json(), adminToggleVehicleStatus);
router.delete("/vehicles/:id", requireAuth, requireAdmin, adminDeleteVehicle);

// POST /api/admin/taxi/vehicles/register (Agent register driver)
router.post("/vehicles/register", requireAuth, requireAdminOrAgent, json(), adminCreateVehicleByAgent);

// POST /api/admin/taxi/upload-document (Agent upload driver documents/photos/camera snap)
router.post("/upload-document", requireAuth, requireAdminOrAgent, json({ limit: '15mb' }), handleDocUpload, adminUploadDocument);

// ================= VEHICLE TYPES ROUTES =================
router.get("/vehicle-types", requireAuth, requireAdminOrAgent, adminGetVehicleTypes);
router.post("/vehicle-types", requireAuth, requireAdmin, json(), adminCreateVehicleType);
router.patch("/vehicle-types/:id", requireAuth, requireAdmin, json(), adminUpdateVehicleType);
router.delete("/vehicle-types/:id", requireAuth, requireAdmin, adminDeleteVehicleType);

// GET /api/admin/taxi/vehicles/:id
router.get("/vehicles/:id", requireAuth, requireAdminOrAgent, adminGetVehicleById);

// PATCH /api/admin/taxi/vehicles/:id/approve
router.patch("/vehicles/:id/approve", requireAuth, requireAdminOrAgent, json(), adminApproveVehicle);

// PATCH /api/admin/taxi/vehicles/:id/reject
router.patch("/vehicles/:id/reject", requireAuth, requireAdminOrAgent, json(), adminRejectVehicle);

// PATCH /api/admin/taxi/vehicles/:id/suspend
router.patch("/vehicles/:id/suspend", requireAuth, requireAdmin, json(), adminSuspendVehicle);

// ================= AGENT ROUTES =================
router.get("/agents", requireAuth, requireAdmin, adminGetAgents);
router.post("/agents", requireAuth, requireAdmin, json(), adminCreateAgent);
router.patch("/agents/:id", requireAuth, requireAdmin, json(), adminUpdateAgent);
router.delete("/agents/:id", requireAuth, requireAdmin, adminDeleteAgent);
router.post("/agents/:id/resend-credentials", requireAuth, requireAdmin, json(), adminResendAgentCredentials);
router.post("/agents/:id/assign-drivers", requireAuth, requireAdmin, json(), adminAssignDriversToAgent);
router.post("/agents/:id/auto-assign", requireAuth, requireAdmin, adminAutoAssignDrivers);

// ================= USER TRACKING & ACCOUNTS ROUTES =================
router.get("/users", requireAuth, requireAdmin, adminGetAllUsers);
router.patch("/users/:id", requireAuth, requireAdmin, json(), adminUpdateUser);
router.delete("/users/:id", requireAuth, requireAdmin, adminDeleteUser);
router.post("/users/:id/reset-password", requireAuth, requireAdmin, json(), adminResetUserPassword);
router.patch("/users/:id/ban", requireAuth, requireAdmin, json(), adminBanUser);
router.get("/circles", requireAuth, requireAdmin, adminGetAllCircles);

// ================= PLANS, SUBSCRIPTIONS & REFERRALS ROUTES =================
router.get("/plans", requireAuth, requireAdmin, adminGetPlans);
router.patch("/plans/:id", requireAuth, requireAdmin, json(), adminUpdatePlan);
router.get("/subscriptions", requireAuth, requireAdmin, adminGetSubscriptions);
router.get("/referrals", requireAuth, requireAdmin, adminGetReferrals);

// ================= ADMIN MANAGEMENT ROUTES =================
router.get("/admins", requireAuth, requireAdmin, adminGetAdmins);
router.post("/admins", requireAuth, requireAdmin, json(), adminCreateAdmin);
router.delete("/admins/:id", requireAuth, requireAdmin, adminDeleteAdmin);

export default router;
