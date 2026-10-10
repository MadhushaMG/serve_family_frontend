import { db } from "../db";
import { NotificationType } from "../db/types";
import { sendNotificationToCircle } from "./sendNotificationHelper";

export { NotificationType as EventType };

export async function triggerSmartNotification(
  circleId: string,
  eventType: NotificationType,
  actorId: string,
  title: string,
  message: string,
  metadata: any = {}
) {
  try {
    console.log(`🔔 Attempting to send notification: ${title} to Circle: ${circleId}`);
    
    await sendNotificationToCircle({
      circleId,
      notificationType: eventType,
      actorId,
      message,
      title,
      body: message,
      data: metadata
    });

    console.log(`✅ Push Notification Logic Finished for: ${title}`);

  } catch (error) {
    console.error("❌ Notification Logic Error:", error);
  }
}
