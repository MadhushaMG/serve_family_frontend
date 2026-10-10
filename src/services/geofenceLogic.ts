import { db } from "../db";
import { getDistanceFromLatLonInMeters } from "../utils/geometry";
import { notifyCircleMembers } from "../notifications/notification-manager";
import { Op } from "sequelize";
import fs from "fs";
import path from "path";

// In-memory queue to prevent race conditions for the same user
const pendingQueue = new Map<string, Array<() => Promise<void>>>();
const userProcessingLock = new Set<string>();
const cooldowns = new Map<string, number>();

function writeToLogFile(message: string) {
  try {
    const logFilePath = path.resolve(process.cwd(), "geofence_logs.txt");
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.appendFile(logFilePath, logEntry, (err) => {
      if (err) console.error("❌ Failed to write to log file:", err);
    });
  } catch (error) {
    console.error("❌ Logger Error:", error);
  }
}

async function processQueue(userId: string) {
  if (userProcessingLock.has(userId)) return;

  const queue = pendingQueue.get(userId);
  if (!queue || queue.length === 0) return;

  userProcessingLock.add(userId);

  // Process only one task at a time for this user
  const nextTask = queue.shift();

  if (nextTask) {
    try {
      await nextTask();
    } catch (error) {
      console.error(`❌ Queue Processing Error for ${userId}:`, error);
    }
  }

  userProcessingLock.delete(userId);

  // If there are more tasks, process the next one immediately
  if (queue.length > 0) {
    processQueue(userId);
  }
}

export async function checkGeofenceTriggers(
  userId: string,
  currentLat: number,
  currentLon: number,
  circleId?: string,
  isTracker: boolean = false,
  deviceId?: string
) {
  const task = async () => {
    try {
      const user = await db.User.findByPk(userId);
      if (!user) return;

      let displayName = user.name;
      const finalIsTracker = isTracker === true;

     
      if (finalIsTracker && deviceId) {
        const entity = await db.Entity.findOne({ where: { deviceId } });
        if (entity) {
           displayName = entity.name; 
        } else {


           const uDevice = await db.UserDevice.findOne({ where: { deviceId } });

           if (uDevice && uDevice.name) displayName = uDevice.name;
        }
      } 


      else if (finalIsTracker && !deviceId) {

         const entity = await db.Entity.findOne({ where: { ownerId: userId } });
         if (entity) displayName = entity.name;
      }

      let targetCircleIds: string[] = [];
      if (circleId) {
        targetCircleIds.push(circleId);
      } else {
        const memberships = await db.Membership.findAll({ where: { userId, status: 'accepted' } });
        targetCircleIds = memberships.map(m => m.circleId);
      }

      if (targetCircleIds.length === 0) return;

      for (const targetCid of targetCircleIds) {
        const locations = await db.Location.findAll({ where: { circleId: targetCid } });

        for (const loc of locations) {
            const distance = getDistanceFromLatLonInMeters(currentLat, currentLon, loc.latitude, loc.longitude);
            const isInside = distance <= loc.radius;

            const userLocRecord = await db.UserLocation.findOne({
              where: { userId, circleId: targetCid, locationId: loc.id }
            });

            const wasInside = userLocRecord?.metadata?.isInside === true;

            // Only act if state changed
            if (isInside !== wasInside) {
                
                // IMPORTANT: Always update the DB state first
                if (userLocRecord) {
                    await userLocRecord.update({
                        latitude: currentLat,
                        longitude: currentLon,
                        metadata: { ...userLocRecord.metadata, isInside: isInside }
                    });
                } else {
                    await db.UserLocation.create({
                        userId,
                        circleId: targetCid,
                        locationId: loc.id,
                        latitude: currentLat,
                        longitude: currentLon,
                        metadata: { isInside: isInside }
                    });
                }

                const cooldownKey = `${userId}-${loc.id}`;
                const now = Date.now();
                const lastSent = cooldowns.get(cooldownKey) || 0;

                // Check Cooldown for NOTIFICATIONS only
                if (now - lastSent > 120000) { // 2 minutes
                    const title = isInside ? `📍 Arrived: ${loc.name}` : `🏃 Left: ${loc.name}`;
                    
                    let finalBody = `${displayName} ${isInside ? 'arrived at' : 'left'} ${loc.name}`;


                    if (finalIsTracker && user.name && displayName !== user.name) {

                       finalBody = `${displayName} (${user.name}) ${isInside ? 'arrived at' : 'left'} ${loc.name}`;
                    }

                    writeToLogFile(`[${finalIsTracker ? 'TRACKER' : 'PHONE'}] ${finalBody} (Lat: ${currentLat}, Lon: ${currentLon})`);

                    await notifyCircleMembers(
                        targetCid,
                        userId,
                        title,
                        finalBody,
                        isInside ? "location_reached" : "location_left",
                        {
                            locationId: String(loc.id),
                            latitude: String(currentLat),
                            longitude: String(currentLon),
                            entityType: finalIsTracker ? 'tracker' : 'phone',
                            includeActor: finalIsTracker,
                            deviceId: deviceId // 👈 Metadata
                        }
                    );

                    cooldowns.set(cooldownKey, now);
                } else {
                    writeToLogFile(`[SKIPPED] ${displayName} ${isInside ? 'arrived at' : 'left'} ${loc.name} (Cooldown Active)`);
                }
            }
        }
      }
    } catch (error) {
      console.error("❌ Geofence Logic Error:", error);
    }
  };

  // Add task to queue
  if (!pendingQueue.has(userId)) {
    pendingQueue.set(userId, []);
  }
  pendingQueue.get(userId)!.push(task);

  // Trigger processing
  processQueue(userId);
}
