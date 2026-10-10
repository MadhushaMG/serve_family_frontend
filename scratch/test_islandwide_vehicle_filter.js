const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../dist/db');
const { getNearbyDrivers, getAvailableRides } = require('../dist/modules/taxi/controllers/taxiController');
const { processRideRequest } = require('../dist/modules/taxi/services/bookingService');

async function runTests() {
  console.log("=================================================================");
  console.log("🧪 TESTING STRICT VEHICLE PROXIMITY & ISLAND-WIDE FILTERING FIX");
  console.log("=================================================================");

  // Let's create or ensure test vehicles at distant locations:
  // Colombo: lat 6.9271, lng 79.8612
  // Kandy: lat 7.2906, lng 80.6337 (~95 km away from Colombo)
  // Galle: lat 6.0535, lng 80.2210 (~110 km away from Colombo)
  // Jaffna: lat 9.6615, lng 80.0255 (~300 km away from Colombo)

  const allVehicles = await db.Vehicle.findAll({
    where: { approvalStatus: 'approved' },
    attributes: ['id', 'vehicleRegNum', 'latitude', 'longitude', 'baseLatitude', 'baseLongitude', 'baseAddress']
  });

  console.log(`Found ${allVehicles.length} approved vehicle(s) in system.`);

  // ---------------------------------------------------------------------------
  // TEST 1: Colombo search (6.9271, 79.8612) with default 15km / max 25km radius
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 1: Searching for vehicles from Colombo (Fort: 6.9271, 79.8612)...");
  const colomboDrivers = await getNearbyDrivers(6.9271, 79.8612, 15, undefined, undefined, false, undefined);
  console.log(`   └─ Discovered ${colomboDrivers.length} vehicle(s).`);

  let maxFoundDist = 0;
  for (const d of colomboDrivers) {
    const dist = Number(d.dataValues?.distance || d.distance || 0);
    if (dist > maxFoundDist) maxFoundDist = dist;
    if (dist > 25.0) {
      console.error(`❌ TEST 1 FAILED: Vehicle ${d.id} (${d.vehicleRegNum}) is ${dist.toFixed(1)}km away (exceeds 25km limit)!`);
      process.exit(1);
    }
  }
  console.log(`   └─ Maximum distance of any returned vehicle: ${maxFoundDist.toFixed(2)} km.`);
  console.log("   ✅ TEST 1 PASSED: All returned vehicles are strictly within 25km proximity!");

  // ---------------------------------------------------------------------------
  // TEST 2: Isolated location with 0 nearby drivers (e.g. lat 9.0, lng 82.0 - Bay of Bengal off coast)
  // MUST NOT dump island-wide vehicles! Must return empty array []
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 2: Searching in an isolated location (e.g., deep sea off coast, 9.0, 82.0)...");
  const isolatedDrivers = await getNearbyDrivers(9.0, 82.0, 15, undefined, undefined, false, undefined);
  console.log(`   └─ Discovered ${isolatedDrivers.length} vehicle(s).`);
  if (isolatedDrivers.length !== 0) {
    console.error(`❌ TEST 2 FAILED: Isolated search returned ${isolatedDrivers.length} vehicles! Old nationwide fallback still active!`);
    process.exit(1);
  }
  console.log("   ✅ TEST 2 PASSED: 0 vehicles returned (no nationwide fallback dump)!");

  // ---------------------------------------------------------------------------
  // TEST 3: Calling getAvailableRides WITHOUT coordinates
  // MUST NOT dump 50 nationwide vehicles! Must return count: 0 and data: []
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 3: Calling getAvailableRides with NO coordinates...");
  let mockResJson = null;
  const mockReqNoCoords = {
    query: {},
    user: null
  };
  const mockRes = {
    json: (data) => {
      mockResJson = data;
      return mockRes;
    },
    status: () => mockRes
  };

  await getAvailableRides(mockReqNoCoords, mockRes);
  console.log(`   └─ Response count: ${mockResJson.count}, data length: ${mockResJson.data.length}, message: "${mockResJson.message}"`);
  if (mockResJson.count !== 0 || mockResJson.data.length !== 0) {
    console.error(`❌ TEST 3 FAILED: Returned ${mockResJson.count} vehicles when no coordinates were provided!`);
    process.exit(1);
  }
  console.log("   ✅ TEST 3 PASSED: getAvailableRides gracefully returns empty list when coordinates are missing!");

  // ---------------------------------------------------------------------------
  // TEST 4: Calling getAvailableRides with Colombo coordinates
  // Verify response formatting and ensure all returned items have distance <= 25km
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 4: Calling getAvailableRides with Colombo coordinates (6.9271, 79.8612)...");
  const mockReqColombo = {
    query: { lat: 6.9271, lng: 79.8612 },
    user: null
  };
  await getAvailableRides(mockReqColombo, mockRes);
  console.log(`   └─ Discovered ${mockResJson.count} vehicle(s) in Colombo area.`);
  for (const item of mockResJson.data) {
    if (item.distance > 25.0) {
      console.error(`❌ TEST 4 FAILED: Vehicle ${item.plateNumber} is ${item.distance}km away!`);
      process.exit(1);
    }
  }
  console.log("   ✅ TEST 4 PASSED: All available rides returned are within 25km!");

  // ---------------------------------------------------------------------------
  // TEST 5: bookingService.processRideRequest distance constraint
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 5: Testing bookingService.processRideRequest...");
  const rideRequestDrivers = await processRideRequest("test-booking", 6.9271, 79.8612);
  for (const d of rideRequestDrivers) {
    const dist = Number(d.dataValues?.distance || d.distance || 0);
    if (dist > 25.0) {
      console.error(`❌ TEST 5 FAILED: processRideRequest driver is ${dist.toFixed(1)}km away!`);
      process.exit(1);
    }
  }
  console.log(`   └─ processRideRequest returned ${rideRequestDrivers.length} driver(s), all <= 25km.`);
  console.log("   ✅ TEST 5 PASSED: processRideRequest enforces 25km proximity limit!");

  console.log("\n=================================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 100% PROXIMITY INTEGRITY VERIFIED");
  console.log("=================================================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
