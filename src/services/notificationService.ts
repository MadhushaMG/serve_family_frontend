import { db } from "../db";
import { Op } from "sequelize";
import { NotificationType, NotificationRecipientType } from "../db/types";

export async function getNotificationRecipients(
  circleId: string,
  notificationType: NotificationType,
  triggeringUserId: string
): Promise<string[]> {
  const circle = await db.Circle.findByPk(circleId);
  if (!circle) return [];

  const recipientType = circle.notificationSettings?.[notificationType] ?? NotificationRecipientType.ALL_MEMBERS;

  if (recipientType === NotificationRecipientType.NONE) return [];

  const memberships = await db.Membership.findAll({
    where: { circleId, status: "accepted" },
  });

  const recipientUserIds = new Set<string>();

  if (recipientType === NotificationRecipientType.ALL_MEMBERS) {
    memberships.forEach((m) => {
      if (m.userId) recipientUserIds.add(m.userId);
    });
    if (circle.creatorId) recipientUserIds.add(circle.creatorId);
  } else if (recipientType === NotificationRecipientType.CREATOR_AND_ADMINS) {
    if (circle.creatorId) recipientUserIds.add(circle.creatorId);
    memberships.forEach((m) => {
      if (m.role === "admin" && m.userId) recipientUserIds.add(m.userId);
    });
  }

  return Array.from(recipientUserIds);
}

export async function updateFirebaseToken(userId: string, token: string, deviceId: string = 'mobile_app') {
  try {
    await db.FirebaseToken.destroy({
      where: {
        token: token,
        userId: { [Op.ne]: userId }
      }
    });

    await db.FirebaseToken.upsert({
      userId,
      token,
      deviceId
    });

    console.log(`✅ Firebase Token updated for user ${userId} (Device: ${deviceId})`);
  } catch (error) {
    console.error("❌ Error updating Firebase token:", error);
  }
}
