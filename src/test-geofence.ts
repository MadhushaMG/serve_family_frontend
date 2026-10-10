import { db } from "./db";
import { checkGeofenceTriggers } from "./services/geofenceLogic";

async function forceTest(userId: string, circleId: string) {
  console.log("🛠️ Starting Force Test on New Circle...");
  try {
    const locations = await db.Location.findAll({ where: { circleId } });
    if (locations.length === 0) {
      console.error("❌ No locations found in this circle! Please create one first.");
      return;
    }
    console.log(`✅ Found ${locations.length} locations. Using: ${locations[0].name}`);

    // Force link creation with all required fields
    const [ul, created] = await (db.UserLocation as any).findOrCreate({
      where: { userId, circleId, locationId: locations[0].id },
      defaults: { 
        userId, 
        circleId, 
        locationId: locations[0].id, 
        metadata: { isInside: true } 
      }
    });

    if (!created) {
      // ලින්ක් එක තිබුණොත් ඒක හිතාමතාම 'Inside' කරමු ටෙස්ට් එක පටන් ගන්න
      await (db.UserLocation as any).update(
        { metadata: { isInside: true } },
        { where: { userId, circleId, locationId: locations[0].id } }
      );
    }
    console.log("✅ User-Location state forced to 'isInside: true'");

    console.log("🏃 Simulating Exit (Moving to Lat 90, Lon 180)...");
    await checkGeofenceTriggers(userId, 90, 180);

    // Notification එක වැදුණද බලන්න
    const notif = await (db.Notification as any).findOne({
      where: { recipientId: userId },
      order: [['createdAt', 'DESC']]
    });

    if (notif && notif.createdAt > new Date(Date.now() - 10000)) {
      console.log(`\n🎉 SUCCESS! Notification Created in DB:`);
      console.log(`   Message: ${notif.message}`);
    } else {
      console.log("\n❌ FAIL: Geofence logic executed but NO new notification created in DB.");
      console.log("   Tip: Check if notification triggers are skipped in services/notificationLogic.ts");
    }

  } catch (e) { 
    console.error("💥 CRASH:", e); 
  } finally { 
    process.exit(); 
  }
}

// ඔයාගේ අලුත් Circle ID එක මෙතනට දාන්න
const NEW_CIRCLE_ID = "130d1480-1f35-408a-9130-88fed62835f4"; 
const USER_ID = "3d2b58ec-f210-4a05-930c-592bb8152f1d";

forceTest(USER_ID, NEW_CIRCLE_ID);
