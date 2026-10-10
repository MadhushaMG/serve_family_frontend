import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { Op } from "sequelize";
import { env } from "../config/env";
import { triggerSmartNotification, EventType } from "../services/notificationLogic";
import { checkGeofenceTriggers } from "../services/geofenceLogic";

import { notifyCircleMembers } from "../notifications/notification-manager";
import { NotificationTemplates } from "../notifications/templates";
import { getUserRoleAndCoverage } from "../services/coverageService";

// Helper to get full avatar URL
function getAvatarUrl(avatar: string | null | undefined, req: AuthRequest): string | null {
  if (!avatar) return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  const host = req.get("host") || new URL(env.APP_URL).host;
  const baseUrl = `${protocol}://${host}`;

  const avatarPath = avatar.startsWith("/") ? avatar : `/${avatar}`;
  return `${baseUrl}${avatarPath}`;
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const User = db.User;
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "name",
        "email",
        "avatar",
        "emailVerified",
        "phoneNumber",
        "phoneVerified",
        "metadata",
        "latitude",
        "longitude",
      ],
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const userPlan = await db.UserPlan.findOne({
      where: { userId },
      include: [
        {
          model: db.Plan,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    const latestBatteryLevel = await db.BatteryLevel.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "batteryLevel", "deviceId", "createdAt"],
    });

    // Resolve user role (driver, user, admin, agent) and geographic coverage status (covered / notcovered)
    const { role, coverageStatus, isCovered, coveredArea } = await getUserRoleAndCoverage(userId, user);

    const existingMeta = (user.metadata && typeof user.metadata === "object") ? { ...user.metadata } : {};
    existingMeta.role = role;
    existingMeta.coverageStatus = coverageStatus;
    existingMeta.status = coverageStatus;
    existingMeta.coverage = coverageStatus;
    existingMeta.covering = coverageStatus;
    existingMeta.isCovered = isCovered;
    existingMeta.covered = isCovered;
    existingMeta.iscovered = isCovered;
    if (coveredArea) {
      existingMeta.coveredArea = coveredArea;
    }

    const userData = user.toJSON() as any;
    userData.role = role;
    userData.coverageStatus = coverageStatus;
    userData.covering = coverageStatus;
    userData.isCovered = isCovered;
    userData.iscovered = isCovered;
    userData.metadata = existingMeta;

    userData.plan = userPlan
      ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      }
      : null;

    userData.avatar = getAvatarUrl(userData.avatar, req);

    userData.batteryLevel = latestBatteryLevel
      ? {
        level: latestBatteryLevel.batteryLevel,
        deviceId: latestBatteryLevel.deviceId,
        updatedAt: latestBatteryLevel.createdAt,
      }
      : null;

    return res.json({ success: true, data: userData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}






export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const User = db.User;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { name, metadata, phoneNumber, latitude, longitude } = req.body as {
      name?: string;
      metadata?: string | object;
      phoneNumber?: string;
      latitude?: number;
      longitude?: number;
    };

    // 1. Basic Details Update
    if (name && typeof name === "string") user.name = name;

    if (phoneNumber !== undefined) {
      if (phoneNumber !== user.phoneNumber) {
        if (phoneNumber) {
          const existingPhone = await db.User.findOne({
            where: { phoneNumber },
          });
          if (existingPhone && existingPhone.id !== userId) {
            return res.status(409).json({
              success: false,
              message: "Phone number already in use",
            });
          }
        }
        user.phoneNumber = phoneNumber || null;
        user.phoneVerified = false;
      }
    }

    // 2. Metadata Update (JSON Handling)
    if (metadata) {
      try {
        if (typeof metadata === "string") {
          user.metadata = JSON.parse(metadata);
        } else {
          user.metadata = metadata;
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid JSON for metadata" });
      }
    }

    // 3. Avatar Update (Multer)
    const anyReq = req as any;
    if (anyReq.file) {
      const filename = anyReq.file.filename;
      user.avatar = `/uploads/${filename}`;
    }

    // 4. Coordinates Update
    if (latitude !== undefined && !isNaN(Number(latitude))) {
      user.latitude = Number(latitude);
    }
    if (longitude !== undefined && !isNaN(Number(longitude))) {
      user.longitude = Number(longitude);
    }

    await user.save();

    if (user.latitude != null && user.longitude != null) {
      try {
        await db.LocationHistory.create({
          userId,
          latitude: user.latitude,
          longitude: user.longitude,
          name: "Profile Location"
        });
      } catch (locErr) {
        // Non-fatal
      }
    }


    const updatedUser = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "avatar", "emailVerified", "phoneNumber", "phoneVerified", "metadata"],
    });

    const userPlan = await db.UserPlan.findOne({
      where: { userId },
      include: [{ model: db.Plan, attributes: ["id", "name", "metadata"] }],
    });

    const latestBatteryLevel = await db.BatteryLevel.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "batteryLevel", "deviceId", "createdAt"],
    });


    const latestLocation = await db.LocationHistory.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "latitude", "longitude", "name", "metadata", "createdAt"],
    });


    const userData = updatedUser?.toJSON() as any;
    if (userData) {
      userData.plan = userPlan ? {
        id: userPlan.Plan?.id,
        name: userPlan.Plan?.name,
        metadata: userPlan.Plan?.metadata,
      } : null;

      userData.avatar = getAvatarUrl(userData.avatar, req);

      userData.batteryLevel = latestBatteryLevel ? {
        batteryLevel: latestBatteryLevel.batteryLevel,
        deviceId: latestBatteryLevel.deviceId,
        updatedAt: latestBatteryLevel.createdAt,
      } : null;


      userData.currentLocation = latestLocation ? {
        id: latestLocation.id,
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        name: latestLocation.name,
        metadata: latestLocation.metadata,
        updatedAt: latestLocation.createdAt
      } : null;

 
     userData.NotificationSettings = user.metadata?.notificationSettings || {
        location_reached: "all_members",
        location_left: "all_members",
        sos_alert: "creator_and_admins",
        low_battery: "creator_and_admins",
        crash_detected: "creator_and_admins",
        invite: "creator_and_admins"
      };
    }

    return res.json({ success: true, data: userData });

  } catch (err: any) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function storeFirebaseToken(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { token, deviceId, deviceType, deviceDetails } = req.body as {
      token?: string;
      deviceId?: string;
      deviceType?: string;
      deviceDetails?: Record<string, any>;
    };

    if (!token) {
      return res.status(400).json({ success: false, message: "token is required" });
    }

    const userAgent = req.get("user-agent") || null;

    const existingToken = deviceId
      ? await db.FirebaseToken.findOne({
        where: { userId, deviceId },
      })
      : null;

    let firebaseToken;
    if (existingToken) {
      existingToken.token = token;
      existingToken.deviceType = deviceType || existingToken.deviceType;
      existingToken.userAgent = userAgent || existingToken.userAgent;
      existingToken.deviceDetails = deviceDetails || existingToken.deviceDetails;
      await existingToken.save();
      firebaseToken = existingToken;
    } else {
      firebaseToken = await db.FirebaseToken.create({
        userId,
        token,
        deviceId: deviceId || null,
        deviceType: deviceType || null,
        userAgent,
        deviceDetails: deviceDetails || null,
      });
    }

    return res.json({ success: true, data: firebaseToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getPendingMembershipRequests(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const pendingRequests = await db.Membership.findAll({
      where: { userId, status: "pending" },
      include: [
        {
          model: db.Circle,
          attributes: ["id", "name", "metadata"],
          include: [
            {
              model: db.User,
              as: "creator",
              attributes: ["id", "name", "email", "avatar"],
            },
            {
              model: db.Location,
              attributes: ["id", "name", "latitude", "longitude"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: pendingRequests,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getAssignedLocations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const assignedLocations = await db.UserLocation.findAll({
      where: { userId },
      include: [
        {
          model: db.Location,
          attributes: ["id", "name", "latitude", "longitude", "metadata"],
          include: [
            {
              model: db.Circle,
              attributes: ["id", "name", "metadata"],
              include: [
                {
                  model: db.User,
                  as: "creator",
                  attributes: ["id", "name", "email", "avatar"],
                },
              ],
            },
          ],
        },
        {
          model: db.Circle,
          attributes: ["id", "name", "metadata"],
          include: [
            {
              model: db.User,
              as: "creator",
              attributes: ["id", "name", "email", "avatar"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: assignedLocations,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateCurrentLocation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const circleId = req.params.circleId;
    const { latitude, longitude, name, metadata } = req.body as {
      latitude?: number;
      longitude?: number;
      name?: string;
      metadata?: Record<string, any>;
    };

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "latitude and longitude are required",
      });
    }

    if (!circleId) {
      return res.status(400).json({
        success: false,
        message: "circleId is required",
      });
    }

    if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "latitude must be a number between -90 and 90",
      });
    }

    if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "longitude must be a number between -180 and 180",
      });
    }

    if (name !== undefined && (typeof name !== "string" || name.length > 255)) {
      return res.status(400).json({
        success: false,
        message: "name must be a string with maximum 255 characters",
      });
    }

    const circle = await db.Circle.findByPk(circleId);
    if (!circle) {
      return res.status(404).json({
        success: false,
        message: "Circle not found",
      });
    }

    const isCreator = circle.creatorId === userId;

    const membership = await db.Membership.findOne({
      where: { userId, circleId, status: "accepted" },
    });
    const isMember = !!membership;

    if (!isCreator && !isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this circle",
      });
    }

    const locationHistory = await db.LocationHistory.create({
      userId,
      latitude,
      longitude,
      name: name || null,
      circleId,
      metadata: metadata || null,
    });

    await checkGeofenceTriggers(userId, latitude, longitude, circleId);

    const result = await db.LocationHistory.findByPk(locationHistory.id, {
      include: [
        {
          model: db.Circle,
          attributes: ["id", "name", "metadata"],
        },
      ],
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function getLocationHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { limit, offset } = req.query as {
      limit?: string;
      offset?: string;
    };

    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        success: false,
        message: "limit must be a number between 1 and 1000",
      });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        success: false,
        message: "offset must be a non-negative number",
      });
    }

    const { count, rows } = await db.LocationHistory.findAndCountAll({
      where: { userId },
      include: [
        {
          model: db.Circle,
          attributes: ["id", "name", "metadata"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset: offsetNum,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < count,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function sendHeartbeat(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const metadata = user.metadata || {};
    metadata.lastHeartbeat = new Date().toISOString();
    user.metadata = metadata;
    await user.save();

    return res.json({
      success: true,
      message: "Heartbeat received",
      timestamp: metadata.lastHeartbeat,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// SOS ALERT
export async function sendSOSAlert(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const {
      message: customMessage,
      latitude,
      longitude,
    } = req.body as {
      message?: string;
      latitude?: number;
      longitude?: number;
    };

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const sosMessage = customMessage || `${user.name} needs help!`;
    const sosAlert = await db.SOSAlert.create({
      userId,
      message: sosMessage,
      latitude: latitude || null,
      longitude: longitude || null,
    });

    const createdCircles = await db.Circle.findAll({ where: { creatorId: userId } });
    const memberships = await db.Membership.findAll({ where: { userId, status: "accepted" } });

    const memberCircleIds = memberships.map((m: any) => m.circleId);
    const createdCircleIds = createdCircles.map((c: any) => c.id);
    const allCircleIds = [...new Set([...createdCircleIds, ...memberCircleIds])];

    if (allCircleIds.length === 0) {
      return res.json({
        success: true,
        message: "SOS alert saved, but user is not a member of any circle",
        data: sosAlert,
      });
    }

    const fullAvatarUrl = getAvatarUrl(user.avatar, req);

    const template = NotificationTemplates.SOS_ALERT(user.name);

    await Promise.all(allCircleIds.map(circleId =>
      notifyCircleMembers(
        circleId as string,
        userId,
        template.title,
        template.body,
        EventType.SOS_ALERT,
        { sosId: sosAlert.id, latitude, longitude }
      )
    ));

    return res.json({
      success: true,
      message: "SOS alert sent",
      data: sosAlert,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateBatteryLevel(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { batteryLevel, deviceId } = req.body as {
      batteryLevel?: number;
      deviceId?: string;
    };

    if (batteryLevel === undefined) {
      return res.status(400).json({ success: false, message: "batteryLevel is required" });
    }

    if (typeof batteryLevel !== "number" || batteryLevel < 0 || batteryLevel > 100) {
      return res.status(400).json({ success: false, message: "batteryLevel must be a number between 0 and 100" });
    }

    const batteryLevelRecord = await db.BatteryLevel.create({
      userId,
      batteryLevel,
      deviceId: deviceId || null,
    });

    return res.json({
      success: true,
      message: "Battery level updated",
      data: batteryLevelRecord,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// LOW BATTERY ALERT
export async function sendLowBatteryAlert(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { batteryLevel, deviceId, threshold } = req.body as {
      batteryLevel?: number;
      deviceId?: string;
      threshold?: number;
    };

    if (batteryLevel === undefined) {
      return res.status(400).json({ success: false, message: "batteryLevel is required" });
    }

    if (typeof batteryLevel !== "number" || batteryLevel < 0 || batteryLevel > 100) {
      return res.status(400).json({ success: false, message: "batteryLevel must be a number between 0 and 100" });
    }

    const batteryThreshold = threshold || 20;

    if (batteryLevel > batteryThreshold) {
      return res.status(400).json({
        success: false,
        message: `Battery level (${batteryLevel}%) is above threshold (${batteryThreshold}%).`,
      });
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const batteryLevelRecord = await db.BatteryLevel.create({
      userId,
      batteryLevel,
      deviceId: deviceId || null,
    });

    const memberships = await db.Membership.findAll({ where: { userId, status: "accepted" } });
    const createdCircles = await db.Circle.findAll({ where: { creatorId: userId } });

    const allCircleIds = [...new Set([
      ...memberships.map((m: any) => m.circleId),
      ...createdCircles.map((c: any) => c.id)
    ])];

    const fullAvatarUrl = getAvatarUrl(user.avatar, req);


    await Promise.all(allCircleIds.map(circleId => {
      const template = NotificationTemplates.LOW_BATTERY("Phone", user.name, batteryLevel);
      return notifyCircleMembers(
        circleId as string,
        userId,
        template.title,
        template.body,
        "low_battery",
        { batteryLevel, deviceId }
      );
    }));

    return res.json({
      success: true,
      message: "Low battery alert sent",
      data: batteryLevelRecord,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// CRASH REPORT
export async function reportCrash(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { latitude, longitude, crashDetails, deviceId } = req.body as {
      latitude?: number;
      longitude?: number;
      crashDetails?: string;
      deviceId?: string;
    };

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const crashRecord = await db.CrashDetection.create({
      userId,
      latitude: latitude || null,
      longitude: longitude || null,
      crashDetails: crashDetails || null,
      deviceId: deviceId || null,
    });

    const memberships = await db.Membership.findAll({ where: { userId, status: "accepted" } });
    const createdCircles = await db.Circle.findAll({ where: { creatorId: userId } });

    const allCircleIds = [...new Set([
      ...memberships.map((m: any) => m.circleId),
      ...createdCircles.map((c: any) => c.id)
    ])];

    const fullAvatarUrl = getAvatarUrl(user.avatar, req);

    await Promise.all(allCircleIds.map(circleId =>
      triggerSmartNotification(
        circleId as string,
        EventType.CRASH_DETECTED, // ✅ Correct Enum
        userId,
        `⚠️ Crash Alert: ${user.name}`,
        `Possible accident detected.`,
        {
          crashId: crashRecord.id,
          latitude,
          longitude,
          details: crashDetails,
          userAvatar: fullAvatarUrl
        }
      )
    ));

    return res.json({
      success: true,
      message: "Crash detected and notifications sent",
      data: crashRecord,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
