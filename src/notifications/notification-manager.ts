import { db } from "../db";
import { sendPushNotification } from "./fcm-service";
import { Op } from "sequelize";

export async function notifyCircleMembers(
  circleId: string,
  actorId: string,
  title: string,
  body: string,
  type: string,
  metadata: any = {}
) {
  try {
    const typeStr = String(type).toLowerCase();
    
    const shouldIncludeActor = false; 

    console.log(`--------------------------------------------------`);
    console.log(`🔔 [NOTIFICATION] Type: ${type} | Circle: ${circleId}`);

    const whereCondition: any = {
      circleId,
      status: 'accepted'
    };

    whereCondition.userId = { [Op.ne]: actorId };

    const memberships = await db.Membership.findAll({ where: whereCondition });
    const recipientIds = memberships.map(m => m.userId);

    console.log(`👥 Recipients Found: ${recipientIds.length} users (Excluding Actor: ${actorId})`);

    // Add actor back if includeActor is true
    if (metadata.includeActor === true && !recipientIds.includes(actorId)) {
       recipientIds.push(actorId);
       console.log(`➕ Included Actor ${actorId} in recipients list.`);
    }

    if (recipientIds.length === 0) {
      console.log(`⚠️ [ABORTED] No recipients found.`);
      return;
    }

    const firebaseTokens = await db.FirebaseToken.findAll({
      where: { userId: { [Op.in]: recipientIds } }
    });

    console.log(`📡 Sending to ${firebaseTokens.length} total tokens...`);

    let successCount = 0;
    for (const tokenRecord of firebaseTokens) {
      const result = await sendPushNotification(tokenRecord.token, title, body, { 
        ...metadata, 
        type: typeStr, 
        circleId 
      });
      if (result.success) successCount++;
    }

    await db.Notification.bulkCreate(recipientIds.map(recipientId => ({
      recipientId, actorId, circleId, type: type as any, message: body, read: false, metadata
    })));

    console.log(`✅ [FINISH] Sent: "${title}" | Delivered: ${successCount}/${firebaseTokens.length}`);
    console.log(`--------------------------------------------------`);
  } catch (error) {
    console.error(`🛑 [CRITICAL ERROR] Notification Manager:`, error);
  }
}
