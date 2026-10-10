import { db } from "./db";
import { triggerSmartNotification, EventType } from "./services/notificationLogic";
import { initHooks } from "./db/hooks";

async function runSafetyTests() {
  try {
    console.log("🔄 Connecting to DB...");
    await db.sequelize.authenticate();
    
    // Hooks Initialize
    initHooks(); 
    console.log("✅ Hooks Initialized.");

    // 1. User ID & Circle ID
    const myUserId = "fe02d2a1-9dd2-4dcf-b2ad-880438744615"; 
    const circleId = "85530364-77b9-4d23-b1a3-595c1d13803f";

    // 3. Fake Friend ID
    const fakeFriendId = "11111111-1111-1111-1111-111111111111"; 

    // --- TEST 1: LOW BATTERY 🔋 ---
    console.log("\n🔋 Testing LOW BATTERY Alert...");
    await triggerSmartNotification(
      circleId,
      EventType.LOW_BATTERY,
      fakeFriendId, 
      "🔋 Low Battery: Fake Friend",
      "Fake Friend's phone is at 15%",
      {
        batteryLevel: 15,
        deviceId: "test-device-123",
        userAvatar: null
      }
    );

    // --- TEST 2: CRASH ALERT 💥 ---
    console.log("\n💥 Testing CRASH ALERT...");
    await triggerSmartNotification(
      circleId,
      EventType.CRASH_DETECTED, //  (APP_CRASH -> CRASH_DETECTED)
      fakeFriendId,
      "⚠️ Crash Alert: Fake Friend",
      "Possible accident detected.",
      {
        crashId: "crash-123",
        latitude: 6.9271,
        longitude: 79.8612,
        details: "Test Crash",
        userAvatar: null
      }
    );

    console.log("⏳ Waiting for Push Notifications to send...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("\n✅ Tests Completed! Check your phone.");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit();
  }
}

runSafetyTests();
