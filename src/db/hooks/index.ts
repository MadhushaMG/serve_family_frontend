import { User, TrackerData, Entity, CircleEntity, LocationHistory, Membership } from "../models";
import { notifyCircleMembers } from "../../notifications/notification-manager";
import { checkGeofenceTriggers } from "../../services/geofenceLogic";

export function initHooks() {
  console.log("🚀 Hooks Registry Initialized!");

  TrackerData.afterCreate(async (data: any) => {
    try {
      const rawData = data.get({ plain: true });
      const imei = rawData.deviceId || rawData.imei;
      const entity = await Entity.findOne({ where: { deviceId: imei } });

      if (!entity || !entity.ownerId) return;

      console.log(`📍 Creating Location History for ${imei}...`);

      await LocationHistory.create({
        userId: entity.ownerId,
        latitude: rawData.latitude,
        longitude: rawData.longitude,
        metadata: {
          speed: rawData.speed,
          battery: rawData.batteryLevel || rawData.battery_level,
          imei: imei
        }
      });
    } catch (error) { console.error("❌ Tracker Hook Error:", error); }
  });

  LocationHistory.afterCreate(async (history: any) => {
    try {
      const { userId, latitude, longitude, metadata } = history.get({ plain: true });
      const isTracker = !!(metadata && (metadata.imei || metadata.isTracker));

      console.log(`🎯 New Location for User ${userId} | Checking Geofences (isTracker: ${isTracker})...`);

      const memberships = await Membership.findAll({ where: { userId, status: 'accepted' } });
      for (const m of memberships) {
        await checkGeofenceTriggers(userId, latitude, longitude, m.circleId, isTracker);
      }
    } catch (error) { console.error("❌ LocationHistory Hook Error:", error); }
  });
}
