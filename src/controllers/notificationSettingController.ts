import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { getDefaultNotificationSettings } from "../utils/notificationDefaults";

export async function getCircleSettings(req: AuthRequest, res: Response) {
  try {
    const { circleId } = req.params;
    const userId = req.user!.userId;

    const membership = await db.Membership.findOne({
      where: { circleId, userId, status: "accepted" }
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "Not a member of this circle" });
    }

    const circle = await db.Circle.findByPk(circleId);
    if (!circle) return res.status(404).json({ success: false, message: "Circle not found" });

    const settings = circle.notificationSettings || getDefaultNotificationSettings();

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function updateCircleSettings(req: AuthRequest, res: Response) {
  try {
    const { circleId } = req.params;
    const userId = req.user!.userId;
    const { settings } = req.body;

    const membership = await db.Membership.findOne({
      where: { circleId, userId, status: "accepted" }
    });

    const circle = await db.Circle.findByPk(circleId);

    if (!circle || !membership) {
        return res.status(404).json({ success: false, message: "Circle or membership not found" });
    }

    const isCreator = circle.creatorId === userId;
    const isAdmin = membership.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: "Only admins can update notification settings" });
    }

    const currentSettings = circle.notificationSettings || getDefaultNotificationSettings();
    
    const updatedSettings = { ...currentSettings, ...settings };

    circle.notificationSettings = updatedSettings;
    circle.changed('notificationSettings', true);
    await circle.save();

    return res.json({ 
        success: true, 
        message: "Settings updated successfully", 
        data: updatedSettings 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
