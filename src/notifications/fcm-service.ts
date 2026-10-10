import { getMessaging } from "firebase-admin/messaging";
import { db } from "../db";

export async function sendPushNotification(token: string, title: string, body: string, data: any = {}) {
  const messaging = getMessaging();

  const stringifiedData: any = {};
  Object.keys(data).forEach(key => {
    stringifiedData[key] = data[key] !== null && data[key] !== undefined ? String(data[key]) : "";
  });

  const message: any = {
    notification: { title, body },
    data: {
      ...stringifiedData,
      title,
      body,
    },
    android: {
      priority: "high",
      notification: {
        channelId: (data.type && String(data.type).startsWith("TAXI_")) ? "taxi_alert_channel" : "default",
        priority: "max",
        sound: "default",
        defaultVibrateTimings: true,
        visibility: "public",
        clickAction: "FLUTTER_NOTIFICATION_CLICK", 
        icon: "stock_ticker_update",
        color: "#f45342"
      }
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          sound: "default",
          badge: 1,
          contentAvailable: true,
          mutableContent: true,
          interruptionLevel: (data.type && String(data.type).startsWith("TAXI_")) ? "time-sensitive" : "active"
        },
      },
    },
    token: token
  };

  try {
    const response = await messaging.send(message);
    console.log(`🚀 FCM Success: Sent to token ${token.substring(0, 10)}...`);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error(`❌ FCM Error for token ${token.substring(0, 10)}... :`, error.message);
    if (error.code === "messaging/invalid-registration-token" || error.code === "messaging/registration-token-not-registered") {
      return { success: false, error: "invalid-token" };
    }
    return { success: false, error: error.message };
  }
}

export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  data: any = {},
  actorId?: string
) {
  try {
    const tokens = await db.FirebaseToken.findAll({ where: { userId } });
    if (!tokens || tokens.length === 0) {
      console.log(`⚠️ [FCM] No Firebase token registered for user: ${userId}`);
    } else {
      console.log(`📡 [FCM] Sending push notification to user ${userId} (${tokens.length} token(s))...`);
      for (const tokenRecord of tokens) {
        const result = await sendPushNotification(tokenRecord.token, title, body, data);
        if (result.error === "invalid-token") {
          await tokenRecord.destroy();
        }
      }
    }

    // Save to in-app Notification table if supported by NotificationType enum
    try {
      const validTypes = [
        "location_reached", "location_left", "invite", "membership_accepted", 
        "membership_rejected", "member_removed", "role_updated", "nickname_updated",
        "location_added", "location_removed", "location_assigned", "location_unassigned",
        "crash_detected", "sos_alert", "low_battery"
      ];
      if (data.type && validTypes.includes(data.type)) {
        await db.Notification.create({
          recipientId: userId,
          actorId: actorId || userId,
          type: data.type,
          message: body,
          read: false,
          metadata: data
        });
      }
    } catch (dbErr) {
      console.warn("⚠️ Failed to create Notification DB record:", dbErr);
    }
  } catch (err) {
    console.error(`❌ Error in sendNotificationToUser (${userId}):`, err);
  }
}

