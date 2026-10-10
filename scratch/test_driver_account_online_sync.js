require('dotenv').config();
const path = require('path');
const { db } = require(path.join(__dirname, '../dist/db'));
const { getAvailableRides, getNearbyDrivers } = require(path.join(__dirname, '../dist/modules/taxi/controllers/taxiController'));
const { isDriverSocketConnected, markDriverUserConnected, markDriverUserDisconnected } = require(path.join(__dirname, '../dist/socket'));

async function runTests() {
  console.log("=== TESTING DRIVER ACCOUNT ONLINE -> TAXI VISIBILITY SYNC ===");

  // Find an approved driver & vehicle
  const vehicle = await db.Vehicle.findOne({
    where: { approvalStatus: 'approved' },
    include: [{ model: db.User, as: 'driver' }]
  });

  if (!vehicle) throw new Error("No approved vehicle found in DB");

  const driverUserId = vehicle.userId;
  console.log(`Testing with Vehicle: ${vehicle.vehicleRegNum} (ID: ${vehicle.id}) - Driver: ${vehicle.driver?.name} (User: ${driverUserId})`);

  // Step 1: Intentionally set Vehicle.isActive = false in DB (simulating toggle status OFF)
  console.log("\n--- Step 1: Setting Vehicle.isActive = false in DB ---");
  await vehicle.update({
    isActive: false,
    latitude: 6.9271,
    longitude: 79.8612,
    updatedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
  });
  await vehicle.reload();
  console.log(`Vehicle.isActive is now: ${vehicle.isActive} (Toggle is OFF in DB)`);

  // Step 2: Driver account is active (User has location and recent updatedAt)
  console.log("\n--- Step 2: Driver Account (User) has active location & recent activity ---");
  await db.User.update(
    {
      latitude: 6.9271,
      longitude: 79.8612,
      updatedAt: new Date()
    },
    { where: { id: driverUserId } }
  );

  // Step 3: Passenger searches with ?isOnline=true
  console.log("\n--- Step 3: Rider searches with ?isOnline=true ---");
  const req = {
    query: { isOnline: "true", lat: "6.9271", lng: "79.8612", radius: "50" }
  };
  let resultData = null;
  const res = {
    json(data) { resultData = data; }
  };

  await getAvailableRides(req, res);

  const foundTaxi = (resultData?.data || []).find(d => d.id === vehicle.id);
  console.log("Was taxi returned to rider?", foundTaxi ? "YES ✅" : "NO ❌");
  if (!foundTaxi) {
    throw new Error("FAILED: Taxi was NOT returned even though driver account is online!");
  }

  console.log(`Found Taxi: ${foundTaxi.vehicleRegNum}, isOnline=${foundTaxi.isOnline}, isActive=${foundTaxi.isActive}, lat=${foundTaxi.latitude}, lng=${foundTaxi.longitude}`);
  if (foundTaxi.isOnline !== true) {
    throw new Error("FAILED: foundTaxi.isOnline was not true!");
  }

  // Step 4: Test Socket connection tracking
  console.log("\n--- Step 4: Test Socket Driver Connection Tracking ---");
  markDriverUserConnected(driverUserId);
  const isConnected = isDriverSocketConnected(driverUserId);
  console.log(`isDriverSocketConnected(${driverUserId}):`, isConnected);
  if (!isConnected) throw new Error("Socket driver tracking failed");

  markDriverUserDisconnected(driverUserId);
  const isDisconnected = isDriverSocketConnected(driverUserId);
  console.log(`After disconnect, isDriverSocketConnected:`, isDisconnected);
  if (isDisconnected !== false) throw new Error("Socket disconnect tracking failed");

  console.log("\n=======================================================");
  console.log("🎉 ALL DRIVER ACCOUNT -> TAXI ONLINE TESTS PASSED 100%!");
  console.log("=======================================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
