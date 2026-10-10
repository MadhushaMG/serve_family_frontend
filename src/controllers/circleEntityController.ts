import { Request, Response } from "express";
import { Entity, CircleEntity } from "../db/models";
import { UserDevice } from "../db/models/UserDevice";

export const addDeviceToCircle = async (req: Request, res: Response) => {
  try {
    console.log("🔥 [API] Request hit: addDeviceToCircle");
    
    const { id } = req.params;
    const { deviceId, name, type } = req.body;
  
    const userId = (req as any).user?.userId || (req as any).user?.id; 

    // Validation
    if (!deviceId) {
        return res.status(400).json({ success: false, message: "Device ID is required" });
    }


    let entity = await Entity.findOne({ 
        where: { deviceId }, 
        paranoid: false 
    });

    if (entity) {
      console.log(`⚠️ [API] Entity found (ID: ${entity.id}). Checking status...`);
      

      if (entity.deletedAt) {
        console.log("♻️ [API] Restoring deleted entity...");
        await entity.restore();
      }
      

      await entity.update({
          name: name || entity.name,
          ownerId: userId,
          type: type || entity.type
      });
      
    } else {
      console.log("✨ [API] Creating NEW Entity...");
      entity = await Entity.create({
        name: name || "New Tracker",
        type: type || "GPS",
        deviceId,
        ownerId: userId
      });
    }


    console.log("🔗 [API] Linking to Circle...");
    await CircleEntity.findOrCreate({
      where: {
        circleId: id,
        entityId: entity.id
      }
    });

    console.log("📱 [API] Updating UserDevice record...");
    await UserDevice.findOrCreate({
      where: { userId, deviceId },
      defaults: {
        userId,
        deviceId,
        name: name || "New Tracker",
        deviceType: type || "GPS",
        metadata: { createdVia: "circle_add" }
      }
    });


    await UserDevice.update(
        { name: name || "New Tracker" }, 
        { where: { userId, deviceId } }
    );

    console.log("✅ [API] Device Added & Linked Successfully!");
    
    return res.status(201).json({
      success: true,
      message: "Device successfully added to circle",
      data: entity
    });

  } catch (error) {
    console.error("❌ [API] Critical Error in addDeviceToCircle:", error);
    return res.status(500).json({ success: false, message: "Error adding device to circle" });
  }
};
