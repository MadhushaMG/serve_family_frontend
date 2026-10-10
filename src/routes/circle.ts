import { Router, json } from "express";
import { requireAuth } from "../middleware/auth";
import {
  listCircles,
  createCircle,
  getCircle,
  getCircleHistory,
  updateCircle,
  deleteCircle,
  assignLocationToUser,
  markLocationReached,
  markLocationLeft,
  createLocationForCircle,
  updateLocationForCircle,
  joinCircleByCode,
  generateInvitationCode,
  removeMember,
  leaveCircle,
  updateNotificationSettings,
  deleteLocationForCircle,
  getMembersLiveStatus,
  unassignLocationFromUser,
  getAllRelationships,
  updateRelationship,
  updateCirclePrivacy,
} from "../controllers/circleController";
import {
  inviteUser,
  acceptInvite,
  rejectInvite,
  listPendingInvites,
  listMyPendingInvites,
  updateUserRole,
  updateNickname,
} from "../controllers/inviteController";
import { addDeviceToCircle } from "../controllers/circleEntityController";

const router = Router();

/**
 * @openapi
 * /api/circles/relationships/all:
 * get:
 * summary: Get all available relationship types
 * tags: [Circles]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: List of relationships returned successfully
 */
router.get("/relationships/all", requireAuth, getAllRelationships);

router.get("/", requireAuth, listCircles);
router.post("/", requireAuth, createCircle);

router.get("/:id", requireAuth, getCircle);

/**
 * @openapi
 * /api/circles/{id}/live-status:
 * get:
 * summary: Get live location status of circle members
 * tags: [Circles]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: List of members with live status
 */
router.get("/:id/live-status", requireAuth, getMembersLiveStatus);

router.get("/:id/history", requireAuth, getCircleHistory);

router.put("/:id", requireAuth, updateCircle);
router.put("/:id/notification-settings", requireAuth, updateNotificationSettings);
router.delete("/:id", requireAuth, deleteCircle);

router.post("/:id/invite", requireAuth, inviteUser);
router.post("/:id/accept-invite", requireAuth, acceptInvite);
router.post("/:id/reject-invite", requireAuth, rejectInvite);
router.get("/:id/invites", requireAuth, listPendingInvites);
router.get("/invites/pending", requireAuth, listMyPendingInvites);

router.put("/:id/members/:userId/role", requireAuth, updateUserRole);
router.put("/:id/members/:userId/nickname", requireAuth, updateNickname);

/**
 * @openapi
 * /api/circles/{id}/members/{userId}/relationship:
 * put:
 * summary: Update or Add a member's relationship
 * tags: [Circles]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * - in: path
 * name: userId
 * required: true
 * schema:
 * type: string
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * relationshipId:
 * type: string
 * nullable: true
 * description: Set UUID to update/add, or null to clear
 * responses:
 * 200:
 * description: Relationship updated successfully
 */
router.put("/:id/members/:userId/relationship", requireAuth, updateRelationship);

router.delete("/:id/members/:userId", requireAuth, removeMember);

router.post("/:id/locations", requireAuth, createLocationForCircle);
router.put("/:id/locations/:locationId", requireAuth, updateLocationForCircle);
router.post("/:id/assign-location", requireAuth, assignLocationToUser);
router.post("/:id/unassign-location", requireAuth, unassignLocationFromUser);
router.post("/:id/mark-location-reached", requireAuth, markLocationReached);
router.post("/:id/mark-location-left", requireAuth, markLocationLeft);
router.delete("/:id/locations/:locationId", requireAuth, deleteLocationForCircle);

router.post("/join-by-code", requireAuth, joinCircleByCode);
router.post("/:id/generate-invitation-code", requireAuth, generateInvitationCode);

router.delete("/:id/leave", requireAuth, leaveCircle);

router.post("/:id/devices", requireAuth, addDeviceToCircle);

router.put("/:id/privacy", requireAuth, json(), updateCirclePrivacy);

export default router;
