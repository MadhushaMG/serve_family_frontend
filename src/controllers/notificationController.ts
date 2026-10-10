import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { db } from "../db";
import { Op } from "sequelize";

/**
 * Get notifications for the authenticated user
 * Supports pagination and filtering by read status
 */
export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { page = "1", perPage = "20", read } = req.query as any;

    const limit = Math.min(Number(perPage) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    // Build where condition
    const where: any = {
      recipientId: userId,
    };

    // Filter by read status if provided
    if (read !== undefined) {
      where.read = read === "true" || read === true;
    }

    // Get notifications with related data
    const { count, rows: notifications } = await db.Notification.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "actor",
          attributes: ["id", "name", "avatar"],
          required: false,
        },
        {
          model: db.Circle,
          attributes: ["id", "name"],
          required: false,
        },
        {
          model: db.Location,
          attributes: ["id", "name", "latitude", "longitude"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Format notifications for response
    const formattedNotifications = notifications.map((notification) => {
      const notificationData = notification.toJSON() as any;
      const actor = (notification as any).actor;
      const circle = (notification as any).Circle;
      const location = (notification as any).Location;
      
      return {
        id: notificationData.id,
        type: notificationData.type,
        message: notificationData.message,
        read: notificationData.read,
        metadata: notificationData.metadata,
        createdAt: notificationData.createdAt,
        actor: actor
          ? {
              id: actor.id,
              name: actor.name,
              avatar: actor.avatar,
            }
          : null,
        circle: circle
          ? {
              id: circle.id,
              name: circle.name,
            }
          : null,
        location: location
          ? {
              id: location.id,
              name: location.name,
              latitude: location.latitude,
              longitude: location.longitude,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        pagination: {
          page: Math.max(Number(page) || 1, 1),
          perPage: limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error getting notifications:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

/**
 * Mark a notification as read
 */
export async function readNotification(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }

    const notification = await db.Notification.findOne({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await notification.update({ read: true });

    return res.json({
      success: true,
      message: "Notification marked as read",
      data: {
        id: notification.id,
        read: true,
      },
    });
  } catch (err) {
    console.error("Error reading notification:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

