import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { Op } from "sequelize";
import { getMessaging } from "firebase-admin/messaging";
import { NotificationType, NotificationRecipientType, NotificationSettings } from "../db/types";
import { getCurrentDate, addDaysToNow } from "../utils/timezone";
import { getDefaultNotificationSettings } from "../utils/notificationDefaults";
import { getNotificationRecipients } from "../services/notificationService";
import { sendNotificationToCircle } from "../services/sendNotificationHelper";
import { triggerSmartNotification, EventType } from "../services/notificationLogic";
import { checkGeofenceTriggers } from "../services/geofenceLogic";
import { checkPlanLimit } from "../utils/limitChecker";


import axios from 'axios';
import { point } from '@turf/helpers';
import distance from '@turf/distance';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestLocationName(lat: number, lon: number, knownLocations: any[]) {
  if (!knownLocations || knownLocations.length === 0) return null;
  let nearestName = null;
  let minDistance = 500;
  for (const loc of knownLocations) {
    if (loc.latitude && loc.longitude) {
      const dist = getDistanceFromLatLonInM(lat, lon, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestName = loc.name;
      }
    }
  }
  return nearestName;
}

function pushJourney(journeysList: any[], points: any[], knownLocations: any[]) {
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  let journeyName = startPoint.name;
  const isGeneric = !journeyName ||
                    journeyName === "Background Update" ||
                    journeyName.includes("Background") ||
                    /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(journeyName);
  if (isGeneric) {
    const nearest = findNearestLocationName(startPoint.latitude, startPoint.longitude, knownLocations);
    if (nearest) {
      journeyName = nearest;
    } else if (!journeyName || journeyName === "Background Update") {
      journeyName = `${startPoint.latitude.toFixed(4)}, ${startPoint.longitude.toFixed(4)}`;
    }
  }
  journeysList.push({
    journeyName,
    startTime: startPoint.timestamp,
    endTime: endPoint.timestamp,
    history: points
  });
}

const processUserJourneys = (history: any[], knownLocations: any[]) => {
  if (!history || history.length === 0) return [];
  const journeys: any[] = [];
  let currentPoints: any[] = [];
  const sorted = history.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const point of sorted) {
    const prev = currentPoints.length > 0 ? currentPoints[currentPoints.length - 1] : null;
    if (prev) {
      if (getDistanceFromLatLonInM(prev.latitude, prev.longitude, point.latitude, point.longitude) < 10) continue;
      if (new Date(point.createdAt).getTime() - new Date(prev.timestamp).getTime() > 5 * 60 * 1000) {
        pushJourney(journeys, currentPoints, knownLocations);
        currentPoints = [];
      }
    }
    currentPoints.push({ id: point.id, latitude: point.latitude, longitude: point.longitude, timestamp: point.createdAt, name: point.name });
  }
  if (currentPoints.length > 0) pushJourney(journeys, currentPoints, knownLocations);
  return journeys;
};

async function generateUniqueInvitationCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  const exists = await db.Circle.findOne({ where: { invitationCode: code } });
  return exists ? generateUniqueInvitationCode() : code;
}

function getFormattedTimeDifference(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}

export async function assignCommonLocationsToMember(userId: string, circleId: string) {
  const all = await db.Location.findAll({ where: { circleId } });
  const common = all.filter(l => l.metadata?.isCommonLocation);
  for (const l of common) {
    await db.UserLocation.findOrCreate({ where: { userId, circleId, locationId: l.id } });
  }
}

export async function listCircles(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { page = "1", perPage = "20" } = req.query as any;
    const limit = Math.min(Number(perPage) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
    const memberships = await db.Membership.findAll({ where: { userId, status: "accepted" }, attributes: ["circleId"] });
    const ids = memberships.map(m => m.circleId);
    const { rows, count } = await db.Circle.findAndCountAll({
      where: { [Op.or]: [{ creatorId: userId }, { id: { [Op.in]: ids } }] },
      limit, offset, distinct: true, order: [["createdAt", "DESC"]],
      include: [
        { model: db.Location },
        { model: db.User, as: "creator", attributes: ["id", "name", "email", "avatar"] },
        { 
          model: db.User, 
          as: "Users", 
          through: { 
            attributes: ["role", "status", "nickname", "relationshipId"], 
            where: { status: "accepted" } 
          }, 
          attributes: ["id", "name", "email", "avatar"],
          required: false 
        }
      ]
    });

    const mappedRows = rows.map((c: any) => {
      const json = typeof c.toJSON === 'function' ? c.toJSON() : c;
      const membersList = json.Users || json.members || [];
      return {
        ...json,
        Users: membersList,
        members: membersList,
      };
    });

    return res.json({ success: true, data: mappedRows, meta: { count, page: Number(page), perPage: limit } });
  } catch (err) { 
    console.error("LIST CIRCLES ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" }); 
  }
}




export async function createCircle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;

    const limitCheck = await checkPlanLimit(userId, 'maxGroups');

    if (!limitCheck.allowed) {
      return res.status(403).json({ 
        success: false, 
        message: limitCheck.message || `According to your plan, you can only create ${limitCheck.limit} groups. Please upgrade your plan to increase this limit.` 
      });
    }


    const circle = await db.Circle.create({
      name: req.body.name,
      creatorId: userId,
      metadata: req.body.metadata || null,
      invitationCode: await generateUniqueInvitationCode(),
      invitationCodeExpiresAt: addDaysToNow(2),
      notificationSettings: getDefaultNotificationSettings()
    });


    const defaultRel = await db.Relationship.findOne({ order: [['createdAt', 'ASC']] });



    await db.Membership.create({
      userId: userId,
      circleId: circle.id,
      status: "accepted",
      role: "admin",
      relationshipId: req.body.relationshipId || defaultRel?.id || null
    });

    return res.status(201).json({ success: true, data: circle });

  } catch (err) {
    console.error("❌ CREATE CIRCLE ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}





export async function getCircle(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id;
    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const allRels = await db.Relationship.findAll();
    const relMap = new Map();
    allRels.forEach(r => relMap.set(r.id, r.name));

    const circle = await db.Circle.findByPk(id, {
      include: [
        { model: db.Location },
        { model: db.User, as: "creator", attributes: ["id", "name", "email", "avatar", "isTracker", "latitude", "longitude", "updatedAt"] },
        { model: db.User, as: "Users", attributes: ["id", "name", "email", "avatar", "isTracker", "latitude", "longitude", "updatedAt"], through: { attributes: ["role", "status", "nickname", "relationshipId"], where: { status: "accepted" } } },
        { model: db.Entity, as: "Entities" }
      ],
    });
    if (!circle) return res.status(404).json({ success: false, message: "Circle not found" });
    const circleData = circle.toJSON() as any;
    const memberIds = (circleData.Users?.map((u: any) => u.id) || []).concat(circleData.creator ? [circleData.creator.id] : []);
    
    let latestBattery = new Map();
    const bats = await db.BatteryLevel.findAll({ where: { userId: { [Op.in]: memberIds } }, order: [["createdAt", "DESC"]] });
    bats.forEach(b => { if (!latestBattery.has(b.userId)) latestBattery.set(b.userId, b); });
    
    const rawHist = await db.LocationHistory.findAll({
      where: {
        circleId: id,
        userId: { [Op.in]: memberIds },
        createdAt: { [Op.gte]: oneDayAgo }
      },
      order: [["createdAt", "DESC"]]
    });

    // PRIVACY SETTINGS LOAD
    const privacyRecords = await db.CirclePrivacy.findAll({ where: { circleId: id, userId: { [Op.in]: memberIds } } });
    const privacyMap = new Map();
    privacyRecords.forEach((p: any) => privacyMap.set(p.userId, p));

    const getLive = async (u: any) => {
      if (u.isTracker && u.latitude) return { latitude: u.latitude, longitude: u.longitude, address: "Live Tracker", updatedAt: u.updatedAt };
      const l = await db.LocationHistory.findOne({ where: { userId: u.id, circleId: id }, order: [["createdAt", "DESC"]] });
      return l ? { latitude: l.latitude, longitude: l.longitude, address: l.name, updatedAt: l.createdAt } : null;
    };

    const format = async (u: any, r?: string) => {
      if (!u) return null;
      const isMe = u.id === req.user!.userId;
      const b = latestBattery.get(u.id);

      let mem = u.Membership;
      if (!mem) mem = await db.Membership.findOne({ where: { userId: u.id, circleId: id } });

      // Privacy Settings Check
      const privacy = privacyMap.get(u.id);
      const shareLoc = privacy ? privacy.shareLocation : true;
      const shareBat = privacy ? privacy.shareBattery : true;
      const shareAvt = privacy ? privacy.shareAvatar : true;

      let finalLiveLocation = await getLive(u);
      let finalJourneys = processUserJourneys(rawHist.filter(h => h.userId === u.id), circleData.Locations || []);
      let finalBattery = b ? { batteryLevel: b.batteryLevel, updatedAt: b.createdAt } : null;
      let finalAvatar = u.avatar;

      // Masking Logic
      if (!isMe) {
        if (!shareLoc) {
          finalLiveLocation = null;
          finalJourneys = [];
        }
        if (!shareBat) finalBattery = null;
        if (!shareAvt) finalAvatar = null;
      }

      return {
        id: u.id, name: mem?.nickname || u.name, email: u.email, avatar: finalAvatar,
        role: r || mem?.role, status: mem?.status || "accepted",
        relationship: mem?.relationshipId ? relMap.get(mem.relationshipId) : "Member",
        batteryLevel: finalBattery,
        liveLocation: finalLiveLocation,
        journeys: finalJourneys
      };
    };

    const entitiesWithStatus = await Promise.all((circleData.Entities || []).map(async (entity: any) => {
      // Entity Logic remains the same (I'll skip full code here to keep it short, paste your existing entity mapping)
      // (KEEP YOUR EXISTING ENTITY LOGIC HERE UP TO return res.json)
      let targetDeviceId = entity.deviceId || entity.device_id || entity.metadata?.deviceId;
      if (!targetDeviceId) return { id: entity.id, name: entity.name, type: entity.type, deviceId: null, liveLocation: null, journeys: [] };
      if (typeof targetDeviceId === "string" && targetDeviceId.length === 15) targetDeviceId = "0" + targetDeviceId;
      const lastData = await db.TrackerData.findOne({ where: { deviceId: targetDeviceId }, order: [['createdAt', 'DESC']] });
      const entityHistory = await db.TrackerData.findAll({ where: { deviceId: targetDeviceId, createdAt: { [Op.gte]: oneDayAgo } }, order: [['createdAt', 'DESC']] });
      const mappedHistory = entityHistory.map(h => ({ id: h.id, latitude: h.latitude, longitude: h.longitude, createdAt: h.createdAt, name: "Background Update" }));
      return {
        id: entity.id, name: entity.name, type: entity.type, deviceId: targetDeviceId,
        liveLocation: lastData ? { latitude: lastData.latitude, longitude: lastData.longitude, speed: lastData.speed, updatedAt: lastData.createdAt, battery: lastData.batteryVoltage } : null,
        journeys: processUserJourneys(mappedHistory, circleData.Locations || [])
      };
    }));

    return res.json({
      success: true,
      data: {
        id: circleData.id, name: circleData.name, invitationCode: circleData.invitationCode, metadata: circleData.metadata, locations: circleData.Locations,
        creator: await format(circleData.creator, "creator"),
        members: await Promise.all((circleData.Users || []).map((u: any) => format(u))),
        entities: entitiesWithStatus
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


export async function getCircleHistory(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id;
    const allRels = await db.Relationship.findAll();
    const relMap = new Map();
    allRels.forEach(r => relMap.set(r.id, r.name));

    const circle = await db.Circle.findByPk(id, { include: [{ model: db.User, as: "creator", attributes: ["id", "name", "email", "avatar", "isTracker", "latitude", "longitude", "updatedAt"] }, { model: db.User, as: "Users", attributes: ["id", "name", "email", "avatar", "isTracker", "latitude", "longitude", "updatedAt"], through: { attributes: ["role", "nickname", "relationshipId"], where: { status: "accepted" } } }] });
    if (!circle) return res.status(404).json({ success: false, message: "Circle not found" });
    const circleData = circle.toJSON() as any;
    const memberIds = (circleData.Users?.map((u: any) => u.id) || []).concat(circleData.creator ? [circleData.creator.id] : []);
    const rawHist = await db.LocationHistory.findAll({ where: { circleId: id, userId: { [Op.in]: memberIds } }, order: [["createdAt", "DESC"]] });
    const getLive = async (u: any) => {
      if (u.isTracker && u.latitude) return { latitude: u.latitude, longitude: u.longitude, address: "Live Tracker", updatedAt: u.updatedAt };
      const l = await db.LocationHistory.findOne({ where: { userId: u.id, circleId: id }, order: [["createdAt", "DESC"]] });
      return l ? { latitude: l.latitude, longitude: l.longitude, address: l.name, updatedAt: l.createdAt } : null;
    };
    const format = async (u: any, r?: string) => {
      let mem = u.Membership;
      if (!mem) {
         mem = await db.Membership.findOne({ where: { userId: u.id, circleId: id } });
      }
      return {
        id: u.id, name: mem?.nickname || u.name,
        relationship: mem?.relationshipId ? relMap.get(mem.relationshipId) : "Member",
        liveLocation: await getLive(u),
        journeys: processUserJourneys(rawHist.filter(h => h.userId === u.id), [])
      }
    };
    return res.json({ success: true, data: { creator: await format(circleData.creator, "creator"), members: await Promise.all((circleData.Users || []).map((u: any) => format(u))) } });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function updateCircle(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findByPk(req.params.id);
    if (!circle || circle.creatorId !== req.user!.userId) return res.status(403).json({ success: false, message: "Forbidden" });
    if (req.body.name) circle.name = req.body.name;
    if (req.body.metadata) circle.metadata = req.body.metadata;
    await circle.save();
    return res.json({ success: true, data: circle });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function deleteCircle(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findByPk(req.params.id);
    if (!circle || circle.creatorId !== req.user!.userId) return res.status(403).json({ success: false, message: "Forbidden" });
    await circle.destroy();
    return res.status(204).send();
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function joinCircleByCode(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findOne({ where: { invitationCode: req.body.code?.toUpperCase() } });
    if (!circle) return res.status(404).json({ success: false, message: "Circle not found" });

    const defaultRel = await db.Relationship.findOne({ order: [['createdAt', 'ASC']] });

    await db.Membership.findOrCreate({ 
      where: { userId: req.user!.userId, circleId: circle.id }, 
      defaults: { 
        userId: req.user!.userId, 
        circleId: circle.id, 
        status: "accepted", 
        role: "member", 
        relationshipId: req.body.relationshipId || defaultRel?.id || null 
      } 
    });

    await assignCommonLocationsToMember(req.user!.userId, circle.id);
    return res.json({ success: true, message: "Joined successfully" });
  } catch (err) { 
    console.error("JOIN CIRCLE ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" }); 
  }
}
export async function removeMember(req: AuthRequest, res: Response) {
  try {
    const { id: circleId, userId: targetUserId } = req.params;
    const actorId = req.user!.userId;
    const targetUser = await db.User.findByPk(targetUserId);
    await db.Membership.destroy({ where: { userId: targetUserId, circleId } });
    await triggerSmartNotification(
        circleId, EventType.MEMBER_REMOVED, actorId, `🚫 Member Removed`,
        `${targetUser?.name || 'A member'} was removed from the circle.`,
        { removedUserId: targetUserId }
    );
    return res.json({ success: true, message: "Removed" });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function leaveCircle(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findByPk(req.params.id);
    if (circle?.creatorId === req.user!.userId) return res.status(400).json({ success: false, message: "Creator cannot leave" });
    await db.Membership.destroy({ where: { userId: req.user!.userId, circleId: req.params.id } });
    return res.json({ success: true, message: "Left" });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function updateNotificationSettings(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findByPk(req.params.id);
    if (!circle || circle.creatorId !== req.user!.userId) return res.status(403).json({ success: false, message: "Forbidden" });
    await circle.update({ notificationSettings: req.body.notificationSettings });
    return res.json({ success: true, data: circle });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function createLocationForCircle(req: AuthRequest, res: Response) {
  try {
    const { name, latitude, longitude, radius } = req.body;
    const circleId = req.params.id;
    const loc = await db.Location.create({
      circleId, name, latitude, longitude, radius: radius || 100, metadata: { isCommonLocation: true }
    });
    const members = await db.Membership.findAll({ where: { circleId, status: "accepted" } });
    if (members.length > 0) {
      const userLocations = members.map((m: any) => ({
        userId: m.userId, locationId: loc.id, circleId: circleId, metadata: { isInside: false }
      }));
      await db.UserLocation.bulkCreate(userLocations);
    }
    await triggerSmartNotification(
        circleId, EventType.LOCATION_ADDED, req.user!.userId, `📍 Location Added`,
        `New location '${name}' added to the circle.`, { locationId: loc.id, locationName: name }
    );
    return res.status(201).json({ success: true, data: loc });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function updateLocationForCircle(req: AuthRequest, res: Response) {
  try {
    const loc = await db.Location.findOne({ where: { id: req.params.locationId, circleId: req.params.id } });
    if (!loc) return res.status(404).json({ success: false, message: "Not found" });
    await loc.update(req.body);
    return res.json({ success: true, data: loc });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function deleteLocationForCircle(req: AuthRequest, res: Response) {
  try {
    const loc = await db.Location.findOne({ where: { id: req.params.locationId, circleId: req.params.id } });
    if (loc) {
        await db.Location.destroy({ where: { id: req.params.locationId, circleId: req.params.id } });
        await triggerSmartNotification(
            req.params.id, EventType.LOCATION_REMOVED, req.user!.userId, `🗑️ Location Removed`,
            `Location '${loc.name}' was removed.`, { locationId: req.params.locationId, locationName: loc.name }
        );
    }
    return res.status(204).send();
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function assignLocationToUser(req: AuthRequest, res: Response) {
  try {
    const { userId, locationId } = req.body;
    const ul = await db.UserLocation.findOrCreate({ where: { userId, circleId: req.params.id, locationId } });
    await triggerSmartNotification(
        req.params.id, EventType.LOCATION_ASSIGNED, req.user!.userId, `📍 Location Assigned`,
        `A location was assigned to a member.`, { locationId, assignedToUserId: userId }
    );
    return res.json({ success: true, data: ul });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}

export async function unassignLocationFromUser(req: AuthRequest, res: Response) {
  try {
    await db.UserLocation.destroy({ where: { userId: req.body.userId, circleId: req.params.id, locationId: req.body.locationId } });
    await triggerSmartNotification(
        req.params.id, EventType.LOCATION_UNASSIGNED, req.user!.userId, `📍 Location Unassigned`,
        `A location was unassigned from a member.`, { locationId: req.body.locationId, unassignedFromUserId: req.body.userId }
    );
    return res.json({ success: true, message: "Unassigned" });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}



export async function updateUserLocationInCircle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const circleId = req.params.id;
    const { latitude, longitude, name, speed } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const lastEntry = await db.LocationHistory.findOne({
      where: { userId, circleId },
      order: [['createdAt', 'DESC']]
    });

    if (lastEntry) {
      const timeDiff = Date.now() - new Date(lastEntry.createdAt).getTime();
      if (timeDiff < 10000) {
        return res.json({ success: true, message: "Skipped duplicate update" });
      }
    }

    const finalSpeed = (speed !== undefined && speed !== null && Number(speed) > 0) ? Number(speed) : 0;
    
    console.log(`📍 [LOC_UPDATE] User: ${userId} | Speed: ${finalSpeed} km/h | Lat: ${latitude}, Lng: ${longitude}`);

    const user = await db.User.findByPk(userId);
    let userMeta = user?.metadata || {};
    userMeta.speed = finalSpeed;
    
    await db.User.update(
      { latitude, longitude, metadata: userMeta },
      { where: { id: userId } }
    );

    // If user is a registered taxi driver, sync their vehicle live GPS & keep them online
    db.Vehicle.update(
      { latitude, longitude, isActive: true, updatedAt: new Date() },
      { where: { userId, approvalStatus: "approved" } }
    ).catch(() => {});

    await db.LocationHistory.create({
      userId,
      circleId,
      latitude,
      longitude,
      metadata: { speed: finalSpeed },
      name: name || "Mobile Update"
    });

    await checkGeofenceTriggers(userId, latitude, longitude);
    
    return res.json({ success: true, message: "Location updated" });
  } catch (err) {
    console.error("❌ Location update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function markLocationReached(req: AuthRequest, res: Response) {
  return res.json({ success: true, message: "Location reached" });
}

export async function markLocationLeft(req: AuthRequest, res: Response) {
  return res.json({ success: true, message: "Location left" });
}

export async function generateInvitationCode(req: AuthRequest, res: Response) {
  try {
    const circle = await db.Circle.findByPk(req.params.id);
    if (!circle) return res.status(404).json({ success: false, message: "Not found" });
    circle.invitationCode = await generateUniqueInvitationCode();
    await circle.save();
    return res.json({ success: true, data: circle });
  } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
}


export async function getMembersLiveStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const circleId = req.params.id;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const allRels = await db.Relationship.findAll();
    const relMap = new Map();
    allRels.forEach(r => relMap.set(r.id, r.name));

    const circle = await db.Circle.findByPk(circleId, {
      include: [
        { model: db.Location },
        {
          model: db.User,
          as: "creator",
          attributes: ["id", "name", "email", "avatar", "latitude", "longitude", "updatedAt", "isTracker"]
        },
        {
          model: db.User,
          as: "Users",
          attributes: ["id", "name", "email", "avatar", "latitude", "longitude", "updatedAt", "isTracker"],
          through: { attributes: ["nickname", "role", "relationshipId"] }
        },
        { model: db.Entity, as: "Entities" }
      ]
    });

    if (!circle) return res.status(404).json({ success: false, message: "Circle not found" });

    const circleData = circle.toJSON() as any;

    let formattedMembers: any[] = [];
    const trackerMap = new Map();

    const uniqueUsersMap = new Map();

    if (circleData.Users) {
      circleData.Users.forEach((u: any) => {
        uniqueUsersMap.set(u.id, { ...u, _computedRole: u.Membership?.role || "member" });
      });
    }

    if (circleData.creator) {
      if (uniqueUsersMap.has(circleData.creator.id)) {
        uniqueUsersMap.get(circleData.creator.id)._computedRole = "creator";
      } else {
        uniqueUsersMap.set(circleData.creator.id, { ...circleData.creator, _computedRole: "creator" });
      }
    }

    const allMembers = Array.from(uniqueUsersMap.values());

    for (const m of allMembers) {
      if (!m.Membership) {
        m.Membership = await db.Membership.findOne({ where: { userId: m.id, circleId: circleId } });
      }
    }

    const memberIds = allMembers.map((m: any) => m.id);

    //  PRIVACY SETTINGS LOAD
    const privacyRecords = await db.CirclePrivacy.findAll({
        where: { circleId: circleId, userId: { [Op.in]: memberIds } }
    });
    const privacyMap = new Map();
    privacyRecords.forEach((p: any) => privacyMap.set(p.userId, p));
    // ------------------------------------

    const latestBatteries = await db.BatteryLevel.findAll({
        where: { userId: { [Op.in]: memberIds } },
        order: [['createdAt', 'DESC']]
    });

    const batteryMap = new Map();
    latestBatteries.forEach(b => {
        if (!batteryMap.has(b.userId)) {
            batteryMap.set(b.userId, b.batteryLevel);
        }
    });

    for (const member of allMembers) {
      const isMe = member.id === userId;

      // PRIVACY SETTINGS CHECK
      const privacy = privacyMap.get(member.id);
      const shareLoc = privacy ? privacy.shareLocation : true;
      const shareBat = privacy ? privacy.shareBattery : true;
      const shareAvt = privacy ? privacy.shareAvatar : true;

      let lat = member.latitude;
      let lng = member.longitude;
      let lastUpdateDate = new Date(member.updatedAt);
      let userSpeed = 0;
      let locationChange = "unknown";

      const lastLocs = await db.LocationHistory.findAll({
        where: { userId: member.id },
        order: [['createdAt', 'DESC']],
        limit: 2
      });

      if (lastLocs && lastLocs.length > 0) {
        const lastLoc = lastLocs[0];
        const locDate = new Date(lastLoc.createdAt);

        if (locDate > lastUpdateDate || lat === null || lng === null) {
          lat = lastLoc.latitude;
          lng = lastLoc.longitude;
          lastUpdateDate = locDate > lastUpdateDate ? locDate : lastUpdateDate;
        }

        if (lastLoc.metadata && typeof lastLoc.metadata === 'object' && 'speed' in lastLoc.metadata) {
            const parsedSpeed = Number(lastLoc.metadata.speed);
            if (!isNaN(parsedSpeed) && lastLoc.metadata.speed !== null) {
                userSpeed = parseFloat(parsedSpeed.toFixed(1));
            }
        }

        if (lastLocs.length > 1) {
            const prevLoc = lastLocs[1];
            const dist = getDistanceFromLatLonInM(lastLoc.latitude, lastLoc.longitude, prevLoc.latitude, prevLoc.longitude);
            locationChange = dist < 5 ? "same" : "different";
        } else {
            locationChange = "same";
        }
      }

      const isOnline = lastUpdateDate > fiveMinutesAgo;
      let status = isOnline ? "Online" : "Offline";

      let locationName = "Unknown";
      if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
        const nearest = findNearestLocationName(Number(lat), Number(lng), circleData.Locations);
        if (nearest) {
          locationName = nearest;
        } else {
          locationName = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
        }
      }

      let lastSeenText = "Just now";
      if (!isOnline) {
          lastSeenText = getFormattedTimeDifference(lastUpdateDate);
      }

      let userBattery = batteryMap.has(member.id) ? `${batteryMap.get(member.id)}%` : null;
      let finalAvatar = member.avatar;

      //  MASKING LOGIC
      if (!isMe) {
          if (!shareLoc) {
              lat = null;
              lng = null;
              locationName = "Location Paused";
              status = "Location Paused";
              userSpeed = 0;
              locationChange = "unknown";
              lastSeenText = "Hidden";
          }
          if (!shareBat) userBattery = null;
          if (!shareAvt) finalAvatar = null;
      }
      // ------------------------------------

      formattedMembers.push({
        id: member.id,
        name: member.Membership?.nickname || member.name,
        relationship: member.Membership?.relationshipId ? relMap.get(member.Membership.relationshipId) : "Member",
        avatar: finalAvatar,
        isMe: isMe,
        role: member._computedRole,
        latitude: lat,
        longitude: lng,
        locationText: locationName,
        status: status,
        locationChange: locationChange,
        lastSeenText: lastSeenText,
        lastSeenISO: lastUpdateDate.toISOString(),
        isTracker: false,
        type: "user",
        speed: userSpeed,
        battery: userBattery,
        powerStatus: null,
        accStatus: null
      });

      const userDevices = await db.UserDevice.findAll({ where: { userId: member.id } });

      if (userDevices && userDevices.length > 0) {
          for (const device of userDevices) {
              let targetDeviceId = device.deviceId;
              if (typeof targetDeviceId === "string" && targetDeviceId.length === 15) {
                  targetDeviceId = "0" + targetDeviceId;
              }

              if (trackerMap.has(targetDeviceId)) continue;

              const lastDataArr = await db.TrackerData.findAll({
                  where: { deviceId: targetDeviceId },
                  order: [['createdAt', 'DESC']],
                  limit: 2
              });

              if (!lastDataArr || lastDataArr.length === 0) {
                  trackerMap.set(targetDeviceId, {
                      id: device.id,
                      name: device.name || "Tracker",
                      relationship: device.deviceType || "Device",
                      avatar: null,
                      isMe: false,
                      role: "member",
                      latitude: null,
                      longitude: null,
                      locationText: "No Data",
                      status: "Offline",
                      locationChange: "unknown",
                      lastSeenText: "Never",
                      lastSeenISO: device.updatedAt,
                      isTracker: true,
                      type: "entity",
                      deviceId: targetDeviceId,
                      speed: 0,
                      battery: null,
                      powerStatus: null,
                      accStatus: null,
                      ownerId: member.id
                  });
                  continue;
              }

              const lastLocationDataArr = await db.TrackerData.findAll({
                  where: {
                      deviceId: targetDeviceId,
                      latitude: { [Op.not]: null },
                      longitude: { [Op.not]: null }
                  },
                  order: [['createdAt', 'DESC']],
                  limit: 2
              });

              const lastLocationData = lastLocationDataArr.length > 0 ? lastLocationDataArr[0] : null;
              const finalLat = lastLocationData ? lastLocationData.latitude : null;
              const finalLng = lastLocationData ? lastLocationData.longitude : null;

              let trackerLocationChange = "unknown";
              if (lastLocationDataArr.length > 1) {
                  const dist = getDistanceFromLatLonInM(
                      Number(lastLocationDataArr[0].latitude), Number(lastLocationDataArr[0].longitude),
                      Number(lastLocationDataArr[1].latitude), Number(lastLocationDataArr[1].longitude)
                  );
                  trackerLocationChange = dist < 5 ? "same" : "different";
              } else if (lastLocationDataArr.length === 1) {
                  trackerLocationChange = "same";
              }

              let trackerLocationName = "Unknown";
              if (finalLat !== null && finalLat !== undefined && finalLng !== null && finalLng !== undefined) {
                  trackerLocationName = `${Number(finalLat).toFixed(4)}, ${Number(finalLng).toFixed(4)}`;
                  const nearest = findNearestLocationName(Number(finalLat), Number(finalLng), circleData.Locations);
                  if (nearest) trackerLocationName = nearest;
              }

              const lastData = lastDataArr[0];
              const trackerLastUpdate = new Date(lastData.createdAt);
              const isTrackerOnline = trackerLastUpdate > fiveMinutesAgo;

              let trackerLastSeenText = "Just now";
              if (!isTrackerOnline) {
                  trackerLastSeenText = getFormattedTimeDifference(trackerLastUpdate);
              }

              trackerMap.set(targetDeviceId, {
                  id: device.id,
                  name: device.name || "Tracker",
                  relationship: device.deviceType || "Device",
                  avatar: null,
                  isMe: false,
                  role: "member",
                  latitude: finalLat,
                  longitude: finalLng,
                  locationText: trackerLocationName,
                  status: isTrackerOnline ? "Online" : "Offline",
                  locationChange: trackerLocationChange,
                  lastSeenText: trackerLastSeenText,
                  lastSeenISO: lastData.createdAt.toISOString(),
                  isTracker: true,
                  type: "entity",
                  deviceId: targetDeviceId,
                  speed: lastLocationData ? (lastLocationData.speed || 0) : 0,
                  battery: lastData.batteryVoltage || null,
                  powerStatus: lastData.powerStatus || null,
                  accStatus: lastData.accStatus || null,
                  ownerId: member.id
              });
          }
      }
    }

    if (circleData.Entities && circleData.Entities.length > 0) {
        for (const entity of circleData.Entities) {
            let targetDeviceId = entity.deviceId || entity.device_id || entity.metadata?.deviceId;

            if (!targetDeviceId) continue;

            if (typeof targetDeviceId === "string" && targetDeviceId.length === 15) {
                targetDeviceId = "0" + targetDeviceId;
            }

            if (trackerMap.has(targetDeviceId)) continue;

            const lastDataArr = await db.TrackerData.findAll({
                where: { deviceId: targetDeviceId },
                order: [['createdAt', 'DESC']],
                limit: 2
            });

            if (!lastDataArr || lastDataArr.length === 0) {
                trackerMap.set(targetDeviceId, {
                    id: entity.id,
                    name: entity.name,
                    relationship: entity.type || "Tracker",
                    avatar: null,
                    isMe: false,
                    role: "member",
                    latitude: null,
                    longitude: null,
                    locationText: "No Data",
                    status: "Offline",
                    locationChange: "unknown",
                    lastSeenText: "Never",
                    lastSeenISO: entity.updatedAt,
                    isTracker: true,
                    type: "entity",
                    deviceId: targetDeviceId,
                    speed: 0,
                    battery: null,
                    powerStatus: null,
                    accStatus: null,
                    ownerId: null
                });
                continue;
            }

            const lastLocationDataArr = await db.TrackerData.findAll({
                where: {
                    deviceId: targetDeviceId,
                    latitude: { [Op.not]: null },
                    longitude: { [Op.not]: null }
                },
                order: [['createdAt', 'DESC']],
                limit: 2
            });

            const lastLocationData = lastLocationDataArr.length > 0 ? lastLocationDataArr[0] : null;
            const finalLat = lastLocationData ? lastLocationData.latitude : null;
            const finalLng = lastLocationData ? lastLocationData.longitude : null;

            let trackerLocationChange = "unknown";
            if (lastLocationDataArr.length > 1) {
                const dist = getDistanceFromLatLonInM(
                    Number(lastLocationDataArr[0].latitude), Number(lastLocationDataArr[0].longitude),
                    Number(lastLocationDataArr[1].latitude), Number(lastLocationDataArr[1].longitude)
                );
                trackerLocationChange = dist < 5 ? "same" : "different";
            } else if (lastLocationDataArr.length === 1) {
                trackerLocationChange = "same";
            }

            let trackerLocationName = "Unknown";
            if (finalLat !== null && finalLat !== undefined && finalLng !== null && finalLng !== undefined) {
                trackerLocationName = `${Number(finalLat).toFixed(4)}, ${Number(finalLng).toFixed(4)}`;
                const nearest = findNearestLocationName(Number(finalLat), Number(finalLng), circleData.Locations);
                if (nearest) trackerLocationName = nearest;
            }

            const lastData = lastDataArr[0];
            const trackerLastUpdate = new Date(lastData.createdAt);
            const isTrackerOnline = trackerLastUpdate > fiveMinutesAgo;

            let trackerLastSeenText = "Just now";
            if (!isTrackerOnline) {
                trackerLastSeenText = getFormattedTimeDifference(trackerLastUpdate);
            }

            trackerMap.set(targetDeviceId, {
                id: entity.id,
                name: entity.name,
                relationship: entity.type || "Tracker",
                avatar: null,
                isMe: false,
                role: "member",
                latitude: finalLat,
                longitude: finalLng,
                locationText: trackerLocationName,
                status: isTrackerOnline ? "Online" : "Offline",
                locationChange: trackerLocationChange,
                lastSeenText: trackerLastSeenText,
                lastSeenISO: lastData.createdAt.toISOString(),
                isTracker: true,
                type: "entity",
                deviceId: targetDeviceId,
                speed: lastLocationData ? (lastLocationData.speed || 0) : 0,
                battery: lastData.batteryVoltage || null,
                powerStatus: lastData.powerStatus || null,
                accStatus: lastData.accStatus || null,
                ownerId: null
            });
        }
    }

    const allCombined = [...formattedMembers, ...Array.from(trackerMap.values())];

    allCombined.sort((a, b) => {
      if (a.isMe) return -1;
      if (b.isMe) return 1;
      if (a.status === "Online" && b.status !== "Online") return -1;
      if (b.status === "Online" && a.status !== "Online") return 1;
      return 0;
    });

    return res.json({
      success: true,
      data: allCombined
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export const getAllRelationships = async (req: AuthRequest, res: Response) => {
    try {
      const relationships = await db.Relationship.findAll({ order: [['name', 'ASC']] });
      return res.json({ success: true, data: relationships });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
};


export const updateRelationship = async (req: AuthRequest, res: Response) => {
    try {
      const { id, userId } = req.params;
      const { relationshipId } = req.body;

      const membership = await db.Membership.findOne({ where: { circleId: id, userId } });

      if (!membership) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }

      await membership.update({ relationshipId });

      return res.status(200).json({ success: true, message: "Relationship updated", data: membership });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
};



async function getSnappedPointMapbox(lat: number, lon: number) {
  try {
    const coordinates = `${lon},${lat};${lon},${lat}`;
    const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&radiuses=25;25`;
    const response = await axios.get(url);
    if (response.data.code === 'Ok' && response.data.matchings.length > 0) {
      const matchedPoint = response.data.matchings[0].geometry.coordinates[0];
      return { lon: matchedPoint[0], lat: matchedPoint[1] };
    }
  } catch (error) {
    console.error("Mapbox API Error:", error);
  }
  return { lat, lon };
}



export async function updateLocationAndGetCircleStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const circleId = req.params.circleId;
    const { latitude, longitude, name, speed } = req.body;
    
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ success: false, message: 'Invalid coordinates' });

    const [existingUser, lastLoc] = await Promise.all([
      db.User.findOne({ where: { id: userId }, attributes: ['metadata', 'latitude', 'longitude'] }),
      db.LocationHistory.findOne({ where: { userId, circleId }, order: [['createdAt', 'DESC']] }),
    ]);

    if (lastLoc) {
      const timeDiff = (Date.now() - new Date(lastLoc.createdAt).getTime()) / 1000;
      const dist = getDistanceFromLatLonInM(lat, lon, lastLoc.latitude, lastLoc.longitude);
      if (timeDiff < 2 && dist < 2) {
        return fetchAndSendCircleData(res, circleId, userId);
      }
    }

    const snappedCurrent = await getSnappedPointMapbox(lat, lon);
    let finalSmoothSpeed = 0;
    const inputSpeed = (speed !== undefined && speed !== null) ? Number(speed) : 0;

    if (lastLoc) {
      const timeDiff = (Date.now() - new Date(lastLoc.createdAt).getTime()) / 1000;
      const isStationary = getDistanceFromLatLonInM(lat, lon, lastLoc.latitude, lastLoc.longitude) < 3;

      if (isStationary) {
        finalSmoothSpeed = 0;
      } else if (inputSpeed > 2) {
        finalSmoothSpeed = Math.round(inputSpeed);
      } else if (timeDiff >= 1) {
        const d = getDistanceFromLatLonInM(lastLoc.latitude, lastLoc.longitude, snappedCurrent.lat, snappedCurrent.lon);
        const calcSpeed = (d / timeDiff) * 3.6;
      

        const lastKnownSpeed = (lastLoc.metadata as any)?.speed || 0;
        finalSmoothSpeed = calcSpeed > 140 ? Number(lastKnownSpeed) : Math.round(calcSpeed);
      }
    }

 
   const updatedMetadata = { 
        ...(existingUser?.metadata ?? {}), 
        speed: finalSmoothSpeed,
        snappedLat: snappedCurrent.lat, 
        snappedLon: snappedCurrent.lon 
    };

    await Promise.all([
      db.User.update(
        { latitude: snappedCurrent.lat, longitude: snappedCurrent.lon, metadata: updatedMetadata }, 
        { where: { id: userId } }
      ),
      db.Vehicle.update(
        { latitude: snappedCurrent.lat, longitude: snappedCurrent.lon, isActive: true, updatedAt: new Date() },
        { where: { userId, approvalStatus: "approved" } }
      ).catch(() => {}),
      db.LocationHistory.create({ 
        userId, 
        circleId, 
        latitude: snappedCurrent.lat, 
        longitude: snappedCurrent.lon, 
        metadata: { speed: finalSmoothSpeed }, 
        name: name || 'Live Update' 
      } as any),
    ]);

    checkGeofenceTriggers(userId, snappedCurrent.lat, snappedCurrent.lon, circleId).catch(err => console.error(err));

    return fetchAndSendCircleData(res, circleId, userId);

  } catch (err) {
    console.error("Update Location Sync Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}




async function fetchAndSendCircleData(res: Response, circleId: string, myUserId: string) {
  const circle = await db.Circle.findByPk(circleId, { 
    include: [
      { model: db.User, as: 'creator', attributes: ['id', 'name', 'avatar', 'updatedAt'] }, 
      { model: db.User, as: 'Users', attributes: ['id', 'name', 'avatar', 'updatedAt'], through: { attributes: ['role'] } },
      { model: db.Location }
    ] 
  });

  if (!circle) return res.status(404).json({ success: false, message: 'Circle not found' });
  const circleData = circle.toJSON() as any;
  const memberIds = [...(circleData.Users || []).map((u: any) => u.id), circleData.creatorId];

  const [allBatteries, allHistories, privacyRecords] = await Promise.all([
    db.BatteryLevel.findAll({ where: { userId: { [Op.in]: memberIds } }, order: [['createdAt', 'DESC']] }),
    db.LocationHistory.findAll({ where: { circleId, userId: { [Op.in]: memberIds } }, order: [['createdAt', 'DESC']] }),
    db.CirclePrivacy.findAll({ where: { circleId, userId: { [Op.in]: memberIds } } }) // PRIVACY DATA
  ]);

  const bMap = new Map();
  allBatteries.forEach((b: any) => { if (!bMap.has(b.userId)) bMap.set(b.userId, b.batteryLevel); });
  const hMap = new Map();
  allHistories.forEach((h: any) => { if (!hMap.has(h.userId)) hMap.set(h.userId, h); });
  const pMap = new Map();
  privacyRecords.forEach((p: any) => pMap.set(p.userId, p)); // PRIVACY MAP

  const format = (u: any, role: string) => {
    const loc = hMap.get(u.id);
    const isOnline = loc && (Date.now() - new Date(loc.createdAt).getTime()) < 300000;
    const isMe = u.id === myUserId;

    // Default values
    let finalLat = loc?.latitude || 0;
    let finalLng = loc?.longitude || 0;
    let finalStatus = isOnline ? 'Online' : 'Offline';
    let finalSpeed = String(loc?.speed || '0');
    let finalLocText = findNearestLocationName(loc?.latitude, loc?.longitude, circleData.Locations) || "Unknown";
    let finalBat: string | null = `${bMap.get(u.id) || 0}%`;
    let finalAvatar = u.avatar;

    // Check Privacy
    const privacy = pMap.get(u.id);
    const shareLoc = privacy ? privacy.shareLocation : true;
    const shareBat = privacy ? privacy.shareBattery : true;
    const shareAvt = privacy ? privacy.shareAvatar : true;

    // Apply Masking
    if (!isMe) {
        if (!shareLoc) {
            finalLat = null as any; 
            finalLng = null as any;
            finalStatus = "Location Paused";
            finalSpeed = "0";
            finalLocText = "Location Hidden";
        }
        if (!shareBat) finalBat = null;
        if (!shareAvt) finalAvatar = null;
    }

    return {
      id: u.id, name: u.name, avatar: finalAvatar, latitude: finalLat, longitude: finalLng,
      status: finalStatus, speed: finalSpeed, 
      locationText: finalLocText,
      lastSeen: loc?.createdAt || u.updatedAt, isMe, role, 
      battery: finalBat,
    };
  };

  const responseData = [format(circleData.creator, 'creator'), ...(circleData.Users || []).map((u: any) => format(u, 'member'))];
  return res.json({ success: true, data: responseData });
}




export async function updateCirclePrivacy(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const circleId = req.params.id;
    const { shareLocation, shareBattery, shareAvatar } = req.body;


    const membership = await db.Membership.findOne({ where: { userId, circleId } });
    if (!membership) {
      return res.status(403).json({ success: false, message: "You are not a member of this circle" });
    }


    const [privacySetting] = await db.CirclePrivacy.findOrCreate({
      where: { userId, circleId },
      defaults: {
        userId,
        circleId,
        shareLocation: true,
        shareBattery: true,
        shareAvatar: true,
      }
    });

 
   if (shareLocation !== undefined) privacySetting.shareLocation = shareLocation;
    if (shareBattery !== undefined) privacySetting.shareBattery = shareBattery;
    if (shareAvatar !== undefined) privacySetting.shareAvatar = shareAvatar;

    await privacySetting.save();

    return res.json({ 
      success: true, 
      message: "Privacy settings updated successfully",
      data: privacySetting
    });

  } catch (err) {
    console.error("❌ Update Privacy Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
