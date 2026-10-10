const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../dist/db');
const { 
  isDriverSocketConnected, 
  markDriverUserConnected, 
  markDriverUserDisconnected 
} = require('../dist/socket');

async function testPhoneOffOfflineSync() {
  console.log("===============================================================");
  console.log("🧪 TESTING PHONE OFF / DISCONNECT AUTO-OFFLINE BEHAVIOR");
  console.log("===============================================================");

  // Find an approved driver vehicle
  const vehicle = await db.Vehicle.findOne({
    where: { approvalStatus: 'approved' }
  });

  if (!vehicle) {
    console.error("❌ No approved vehicle found for testing!");
    process.exit(1);
  }

  const driverUserId = vehicle.userId;
  const mockSocketId = "mock_phone_socket_998877";

  console.log(`Driver Vehicle: ${vehicle.vehicleRegNum} (ID: ${vehicle.id})`);
  console.log(`Driver User ID: ${driverUserId}`);

  // -------------------------------------------------------------
  // STEP 1: Driver phone turns ON & connects socket
  // -------------------------------------------------------------
  console.log("\n▶ STEP 1: Driver phone turns on & connects socket...");
  markDriverUserConnected(driverUserId, mockSocketId);
  await vehicle.update({ isActive: true, updatedAt: new Date() });

  const isConnectedBefore = isDriverSocketConnected(driverUserId);
  const reloadedV1 = await db.Vehicle.findByPk(vehicle.id);

  console.log(`   └─ Socket Live: ${isConnectedBefore} (Expected: true)`);
  console.log(`   └─ DB isActive: ${reloadedV1.isActive} (Expected: true)`);

  if (!isConnectedBefore || !reloadedV1.isActive) {
    console.error("❌ Step 1 failed: Driver should be online!");
    process.exit(1);
  }
  console.log("   ✅ STEP 1 PASSED: Driver is successfully online!");

  // -------------------------------------------------------------
  // STEP 2: Driver turns phone OFF (Socket disconnects!)
  // -------------------------------------------------------------
  console.log("\n▶ STEP 2: Driver turns phone OFF (Socket abruptly disconnects)...");
  // Simulating socket.on("disconnect")
  await markDriverUserDisconnected("", mockSocketId, "transport close / phone off");

  const isConnectedAfter = isDriverSocketConnected(driverUserId);
  const reloadedV2 = await db.Vehicle.findByPk(vehicle.id);

  console.log(`   └─ Socket Live: ${isConnectedAfter} (Expected: false)`);
  console.log(`   └─ DB isActive: ${reloadedV2.isActive} (Expected: false)`);

  if (isConnectedAfter || reloadedV2.isActive !== false) {
    console.error("❌ Step 2 failed: Driver should be marked OFFLINE in DB after phone turns off!");
    process.exit(1);
  }
  console.log("   ✅ STEP 2 PASSED: Driver vehicle was automatically updated to OFFLINE in DB!");

  // -------------------------------------------------------------
  // STEP 3: Admin & Passenger Queries must NOT resurrect offline driver
  // -------------------------------------------------------------
  console.log("\n▶ STEP 3: Check Passenger onlineOnly query...");
  const onlineDrivers = await db.Vehicle.findAll({
    where: {
      approvalStatus: 'approved',
      isActive: true
    }
  });

  const isStillInOnlineList = onlineDrivers.some(v => v.id === vehicle.id);
  console.log(`   └─ In Online Passenger List: ${isStillInOnlineList} (Expected: false)`);

  if (isStillInOnlineList) {
    console.error("❌ Step 3 failed: Offline driver was included in online-only query!");
    process.exit(1);
  }
  console.log("   ✅ STEP 3 PASSED: Offline driver is NOT visible in online-only passenger list!");

  // -------------------------------------------------------------
  // STEP 4: Ensure Admin controller mapping doesn't resurrect them
  // -------------------------------------------------------------
  console.log("\n▶ STEP 4: Check Admin controller online evaluation...");
  const isSocketLive = Boolean(isDriverSocketConnected(reloadedV2.userId) || isDriverSocketConnected(reloadedV2.id));
  const isOnline = Boolean(reloadedV2.isActive) || isSocketLive;

  console.log(`   └─ Admin Evaluated isOnline: ${isOnline} (Expected: false)`);
  if (isOnline) {
    console.error("❌ Step 4 failed: Admin should evaluate driver as OFFLINE!");
    process.exit(1);
  }
  console.log("   ✅ STEP 4 PASSED: Admin evaluates driver as OFFLINE!");

  console.log("\n===============================================================");
  console.log("🎉 ALL PHONE-OFF / DISCONNECT TESTS PASSED 100%!");
  console.log("===============================================================");
  process.exit(0);
}

testPhoneOffOfflineSync().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
