import { db } from "../db";
import { getMessaging } from "firebase-admin/messaging";
import { NotificationType } from "../db/types";
import { getNotificationRecipients } from "./notificationService";
import { Op } from "sequelize";

interface SendNotificationOptions {
  circleId: string;
  notificationType: NotificationType;
  actorId: string;
  message: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  locationId?: string | null;
}

export async function sendNotificationToCircle({
  circleId,
  notificationType,
  actorId,
  message,
  title,
  body,
  data = {},
  locationId = null,
}: SendNotificationOptions): Promise<{
  successfulNotifications: number;
  failedNotifications: number;
  totalRecipients: number;
  tokensFound: number;
}> {
  const recipientIds = await getNotificationRecipients(circleId, notificationType, actorId);
  const filteredRecipientIds = recipientIds.filter(id => id !== actorId);

  if (filteredRecipientIds.length === 0) {
    return { successfulNotifications: 0, failedNotifications: 0, totalRecipients: 0, tokensFound: 0 };
  }

  const firebaseTokens = await db.FirebaseToken.findAll({
    where: { userId: { [Op.in]: filteredRecipientIds } },
  });

  const messaging = getMessaging();
  let successfulNotifications = 0;

  if (firebaseTokens.length > 0) {
    const notificationResults = await Promise.allSettled(
      firebaseTokens.map(async (tokenRecord) => {
        const fcmMessage = {
          notification: {
            title: title,
            body: body
          },
          data: {
            ...data,
            title: title,
            body: body,
            type: String(notificationType),
            circleId: String(circleId),
          },
          android: {
            priority: "high" as const,
            notification: {
              channelId: "default",
              priority: "max" as const,
              visibility: "public" as const,
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
                contentAvailable: true,
                mutableContent: true,
              },
            },
          },
          token: tokenRecord.token,
        };

        try {
          const response = await messaging.send(fcmMessage);
          return { success: true, userId: tokenRecord.userId };
        } catch (error: any) {
          if (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered") {
            await tokenRecord.destroy();
          }
          return { success: false, userId: tokenRecord.userId };
        }
      })
    );
    successfulNotifications = notificationResults.filter((r) => r.status === "fulfilled" && (r as any).value.success).length;
  }

  const notificationPromises = filteredRecipientIds.map((recipientId: string) => {
    return db.Notification.create({
      recipientId,
      actorId,
      circleId,
      locationId,
      type: notificationType,
      message: body,
      read: false,
    });
  });

  await Promise.all(notificationPromises);

  return {
    successfulNotifications,
    failedNotifications: firebaseTokens.length - successfulNotifications,
    totalRecipients: filteredRecipientIds.length,
    tokensFound: firebaseTokens.length
  };
}
