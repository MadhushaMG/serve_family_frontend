import { Request, Response } from "express";
import { TrackerData } from "../db/models/TrackerData";
import { UserDevice } from "../db/models/UserDevice";
import { Op } from "sequelize";
import { sequelize } from "../db/sequelize";
import { AuthRequest } from "../middleware/auth";
import { parseDate } from "../utils/timezone";
import { Circle } from "../db/models/Circle";
import { Entity } from "../db/models/Entity";
import { CircleEntity } from "../db/models/CircleEntity";
import { Membership } from "../db/models/Membership";
import { canAddMore } from "../utils/planLimits";
import { markNotificationAsRead } from "../controllers/deviceController";

interface TrackerQueryParams {
  page?: string;
  limit?: string;
  deviceId?: string;
  startDate?: string;
  endDate?: string;
  gpsStatus?: string;
}

export async function getTrackerData(req: Request, res: Response) {
  try {
    const {
      page = "1",
      limit = "50",
      deviceId,
      startDate,
      endDate,
      gpsStatus,
    } = req.query as TrackerQueryParams;

    console.log(`🔍 [API] Fetching Tracker Data: Device=${deviceId || 'All'} | Status=${gpsStatus || 'Any'}`);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (gpsStatus) {
      where.gpsStatus = gpsStatus.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = parseDate(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = parseDate(endDate);
      }
    }

    const { rows: trackerData, count } = await TrackerData.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      data: {
        trackerData: trackerData.map((data) => ({
          id: data.id,
          deviceId: data.deviceId,
          msgType: data.msgType,
          gpsStatus: data.gpsStatus,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          course: data.course,
          accStatus: data.accStatus,
          powerStatus: data.powerStatus,
          gsmSignal: data.gsmSignal,
          batteryVoltage: data.batteryVoltage,
          satellites: data.satellites,
          statusHex: data.statusHex,
          rawData: data.rawData,
          metadata: data.metadata,
          createdAt: data.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching tracker data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tracker data",
      errors: [error.message],
    });
  }
}

export async function getTrackerDataByDeviceId(req: Request, res: Response) {
  try {
    const { deviceId } = req.params;
    const {
      page = "1",
      limit = "50",
      startDate,
      endDate,
    } = req.query as TrackerQueryParams;

    console.log(`🔍 [API] Fetching Data for Device: ${deviceId}`);

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const where: any = { deviceId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = parseDate(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = parseDate(endDate);
      }
    }

    const { rows: trackerData, count } = await TrackerData.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    return res.json({
      success: true,
      data: {
        deviceId,
        trackerData: trackerData.map((data) => ({
          id: data.id,
          deviceId: data.deviceId,
          msgType: data.msgType,
          gpsStatus: data.gpsStatus,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          course: data.course,
          accStatus: data.accStatus,
          powerStatus: data.powerStatus,
          gsmSignal: data.gsmSignal,
          batteryVoltage: data.batteryVoltage,
          satellites: data.satellites,
          statusHex: data.statusHex,
          rawData: data.rawData,
          metadata: data.metadata,
          createdAt: data.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count,
          totalPages: Math.ceil(count / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching tracker data by device ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch tracker data",
      errors: [error.message],
    });
  }
}

export async function getDeviceIds(req: Request, res: Response) {
  try {
    const [results] = await sequelize.query(
      'SELECT DISTINCT device_id as "deviceId" FROM tracker_data ORDER BY device_id'
    );
    const deviceIds = (results as Array<{ deviceId: string }>).map((item) => item.deviceId);
    return res.json({
      success: true,
      data: { deviceIds },
    });
  } catch (error: any) {
    console.error("Error fetching device IDs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch device IDs",
      errors: [error.message],
    });
  }
}



export async function addUserDevice(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        errors: ["User not authenticated"],
      });
    }

    const { deviceId, name, simNumber, deviceType } = req.body;
    const limitCheck = await canAddMore(userId, 'devices');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: limitCheck.message || "Plan limit exceeded",
        errors: ["Plan limit exceeded"]
      });
    }

    console.log(`➕ [API] Adding User Device: User=${userId} | Device=${deviceId} | Name=${name}`);

    if (!deviceId || typeof deviceId !== "string" || deviceId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
        errors: ["deviceId is required"],
      });
    }

    const existingDevice = await UserDevice.findOne({
      where: { userId, deviceId: deviceId.trim() },
    });

    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: "Device already exists",
        errors: ["This device is already associated with your account"],
      });
    }

    const userDevice = await UserDevice.create({
      userId,
      deviceId: deviceId.trim(),
      name: name?.trim() || "My Tracker",
      simNumber: simNumber?.trim() || null,
      deviceType: deviceType?.trim() || "Car",
    });

    return res.status(201).json({
      success: true,
      data: {
        device: {
          id: userDevice.id,
          userId: userDevice.userId,
          deviceId: userDevice.deviceId,
          name: userDevice.name,
          simNumber: userDevice.simNumber,
          deviceType: userDevice.deviceType,
          createdAt: userDevice.createdAt,
          updatedAt: userDevice.updatedAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Error adding user device:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add device",
      errors: [error.message],
    });
  }
}



export async function getUserDevices(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        errors: ["User not authenticated"],
      });
    }

    console.log(`📱 [API] Get User Devices for User: ${userId}`);

    const devices = await UserDevice.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: {
        devices: devices.map((device) => ({
          id: device.id,
          userId: device.userId,
          deviceId: device.deviceId,
          name: device.name,
          simNumber: device.simNumber,
          deviceType: device.deviceType,
          metadata: device.metadata,
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("Error fetching user devices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      errors: [error.message],
    });
  }
}

export async function getDeviceLiveStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { deviceId } = req.params;

    const device = await UserDevice.findOne({ where: { deviceId, userId } });
    if (!device) {
      return res.status(403).json({ success: false, message: "Unauthorized or device not found" });
    }

    const latestData = await TrackerData.findOne({
      where: { deviceId },
      order: [["createdAt", "DESC"]],
    });

    // ----- LOGGING -----
    console.log(`📡 [API] Live Status: Device=${deviceId} | Battery=${latestData?.batteryVoltage || 'N/A'} | Speed=${latestData?.speed || 0}`);
    // -------------------

    return res.json({
      success: true,
      data: {
        deviceInfo: {
          deviceId: device.deviceId,
          name: device.name,
          type: device.deviceType,
          sim: device.simNumber
        },
        liveData: latestData ? {
          latitude: latestData.latitude,
          longitude: latestData.longitude,
          speed: latestData.speed,
          accStatus: latestData.accStatus,
          battery: latestData.batteryVoltage,
          gsm: latestData.gsmSignal,
          satellites: latestData.satellites,
          lastUpdate: latestData.createdAt
        } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Server error", errors: [error.message] });
  }
}

export async function removeUserDevice(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        errors: ["User not authenticated"],
      });
    }

    const { deviceId } = req.params;
    console.log(`🗑️ [API] Removing Device: User=${userId} | Device=${deviceId}`);

    const device = await UserDevice.findOne({
      where: {
        userId,
        deviceId: deviceId.trim(),
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found",
        errors: ["This device is not associated with your account"],
      });
    }

    await device.destroy();

    return res.json({
      success: true,
      message: "Device removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing user device:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove device",
      errors: [error.message],
    });
  }
}



export async function addDeviceToCircle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const circleId = req.params.id || req.body.circleId;
    const { deviceId, name } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!circleId || !deviceId) return res.status(400).json({ success: false, message: "Circle ID and Device ID are required" });

    console.log(`🔗 [API] Linking Tracker to Circle: Circle=${circleId} | Device=${deviceId}`);

    const membership = await Membership.findOne({
      where: { 
        userId, 
        circleId, 
        status: "accepted",
        role: "admin" 
      }
    });

    if (!membership) {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: You must be an admin of this circle to add tracker devices." 
      });
    }

    let cleanDeviceId = deviceId.trim();
    if (cleanDeviceId.length === 15) {
      cleanDeviceId = "0" + cleanDeviceId;
    }

    const [entity] = await Entity.findOrCreate({
      where: { deviceId: cleanDeviceId },
      defaults: {
        deviceId: cleanDeviceId,
        name: name || "GPS Tracker",
        type: "tracker",
        ownerId: userId,
        metadata: { deviceType: "gps_tracker" }
      }
    });

    const [circleEntity, created] = await CircleEntity.findOrCreate({
      where: {
        circleId,
        entityId: entity.id
      },
      defaults: {
        circleId,
        entityId: entity.id
      }
    });

    if (!created) {
      return res.status(409).json({ success: false, message: "This device is already linked to this circle" });
    }

    return res.status(201).json({
      success: true,
      message: "Device added to circle successfully",
      data: {
        circleEntity,
        entityName: entity.name,
        deviceId: cleanDeviceId
      }
    });

  } catch (error: any) {
    console.error("❌ Error adding device to circle:", error);
    return res.status(500).json({ success: false, message: "Server error", errors: [error.message] });
  }
}


export async function updateDeviceInCircle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const circleId = req.params.id;
    const deviceId = req.params.deviceId;
    const { name } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!circleId || !deviceId) {
      return res.status(400).json({ success: false, message: "Circle ID and Device ID are required" });
    }

    const membership = await Membership.findOne({
      where: { userId, circleId, status: "accepted" }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "You are not a member of this circle" });
    }

    const entity = await Entity.findOne({
      where: {
        [Op.or]: [
          { name: deviceId },
          { "metadata.deviceId": deviceId }
        ]
      }
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: "Device (Entity) not found" });
    }

    const circleEntity = await CircleEntity.findOne({
      where: { circleId, entityId: entity.id }
    });

    if (!circleEntity) {
      return res.status(404).json({ success: false, message: "Device is not linked to this circle" });
    }

    if (name) {
      await entity.update({ name });
    }

    return res.json({
      success: true,
      message: "Device updated successfully",
      data: entity
    });

  } catch (error: any) {
    console.error("Error updating device:", error);
    return res.status(500).json({ success: false, message: "Server error", errors: [error.message] });
  }
}

export async function removeDeviceFromCircle(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const circleId = req.params.id;
    const deviceId = req.params.deviceId;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!circleId || !deviceId) {
      return res.status(400).json({ success: false, message: "Circle ID and Device ID are required" });
    }

    console.log(`❌ [API] Removing Device from Circle: Circle=${circleId} | Device=${deviceId}`);

    const membership = await Membership.findOne({
      where: { userId, circleId, status: "accepted" }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "You are not a member of this circle" });
    }

    const entity = await Entity.findOne({
      where: {
        [Op.or]: [
          { name: deviceId },
          { "metadata.deviceId": deviceId }
        ]
      }
    });

    if (!entity) {
      return res.status(404).json({ success: false, message: "Device (Entity) not found" });
    }

    const circleEntity = await CircleEntity.findOne({
      where: { circleId, entityId: entity.id }
    });

    if (!circleEntity) {
      return res.status(404).json({ success: false, message: "Device is not linked to this circle" });
    }

    await circleEntity.destroy();

    return res.json({
      success: true,
      message: "Device removed from circle successfully"
    });

  } catch (error: any) {
    console.error("Error removing device from circle:", error);
    return res.status(500).json({ success: false, message: "Server error", errors: [error.message] });
  }
}
