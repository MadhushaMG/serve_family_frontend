require('dotenv').config();
const path = require('path');
const { db } = require(path.join(__dirname, '../dist/db'));
const { toggleDriverOnlineStatus, getDriverStatus, getAvailableRides, getDriverBookings } = require(path.join(__dirname, '../dist/modules/taxi/controllers/taxiController'));
const { adminToggleVehicleStatus } = require(path.join(__dirname, '../dist/modules/taxi/controllers/adminTaxiController'));

function mockReq(options = {}) {
  return {
    user: options.user || { userId: "1c811f24-37d4-41c2-90f2-3170ecf0580d" },
    body: options.body || {},
    query: options.query || {},
    params: options.params || {}
  };
}

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log("=== STARTING ONLINE / OFFLINE LIFECYCLE TESTS ===");

  // 1. Find an approved driver & vehicle
  const vehicle = await db.Vehicle.findOne({
    where: { approvalStatus: 'approved' },
    include: [{ model: db.User, as: 'driver' }]
  });

  if (!vehicle) {
    throw new Error("No approved vehicle found in DB to test!");
  }

  const driverUserId = vehicle.userId;
  console.log(`Testing with Vehicle: ${vehicle.vehicleRegNum} (ID: ${vehicle.id}) owned by Driver: ${vehicle.driver?.name} (User: ${driverUserId})`);

  // Test 1: Get Driver Status
  console.log("\n--- Test 1: getDriverStatus ---");
  const req1 = mockReq({ user: { userId: driverUserId } });
  const res1 = mockRes();
  await getDriverStatus(req1, res1);
  console.log("Status response:", res1.statusCode, res1.data);
  if (!res1.data?.success) throw new Error("getDriverStatus failed");

  // Test 2: Explicitly toggle ONLINE
  console.log("\n--- Test 2: toggleDriverOnlineStatus (Go ONLINE) ---");
  const req2 = mockReq({
    user: { userId: driverUserId },
    body: { isOnline: true, latitude: 6.9271, longitude: 79.8612 }
  });
  const res2 = mockRes();
  await toggleDriverOnlineStatus(req2, res2);
  console.log("Toggle ONLINE response:", res2.statusCode, res2.data);
  if (!res2.data?.success || res2.data?.data?.isActive !== true) {
    throw new Error("toggleDriverOnlineStatus(true) failed");
  }

  // Verify in DB
  await vehicle.reload();
  if (vehicle.isActive !== true) throw new Error("DB vehicle.isActive was not true after toggle online");
  console.log("DB verified: vehicle.isActive = true, lat =", vehicle.latitude, "lng =", vehicle.longitude);

  // Test 3: Passenger searches for available rides (?isOnline=true)
  console.log("\n--- Test 3: getAvailableRides (Passenger search ?isOnline=true) ---");
  const req3 = mockReq({
    query: { isOnline: "true", lat: "6.9271", lng: "79.8612", radius: "50" }
  });
  const res3 = mockRes();
  await getAvailableRides(req3, res3);
  const foundOnlineDriver = (res3.data?.data || []).find(d => d.id === vehicle.id);
  console.log("Passenger search found vehicle:", foundOnlineDriver ? `YES (isOnline=${foundOnlineDriver.isOnline})` : "NO");
  if (!foundOnlineDriver || foundOnlineDriver.isOnline !== true) {
    throw new Error("Passenger search failed to find online driver!");
  }

  // Test 4: Explicitly toggle OFFLINE
  console.log("\n--- Test 4: toggleDriverOnlineStatus (Go OFFLINE) ---");
  const req4 = mockReq({
    user: { userId: driverUserId },
    body: { isOnline: false }
  });
  const res4 = mockRes();
  await toggleDriverOnlineStatus(req4, res4);
  console.log("Toggle OFFLINE response:", res4.statusCode, res4.data);
  if (!res4.data?.success || res4.data?.data?.isActive !== false) {
    throw new Error("toggleDriverOnlineStatus(false) failed");
  }

  await vehicle.reload();
  if (vehicle.isActive !== false) throw new Error("DB vehicle.isActive was not false after toggle offline");
  console.log("DB verified: vehicle.isActive = false");

  // Test 5: Poll getDriverBookings while OFFLINE - should NOT flip back to online!
  console.log("\n--- Test 5: getDriverBookings while OFFLINE (Regression Test) ---");
  const req5 = mockReq({ user: { userId: driverUserId } });
  const res5 = mockRes();
  await getDriverBookings(req5, res5);
  await vehicle.reload();
  console.log("After getDriverBookings, vehicle.isActive =", vehicle.isActive, "(Must remain false)");
  if (vehicle.isActive !== false) {
    throw new Error("REGRESSION: getDriverBookings forced offline driver back to online!");
  }

  // Test 6: Toggle without body (inverts status from false -> true)
  console.log("\n--- Test 6: toggleDriverOnlineStatus without body (Inverts status) ---");
  const req6 = mockReq({ user: { userId: driverUserId }, body: {} });
  const res6 = mockRes();
  await toggleDriverOnlineStatus(req6, res6);
  await vehicle.reload();
  console.log("After empty toggle, vehicle.isActive =", vehicle.isActive, "(Must be true)");
  if (vehicle.isActive !== true) {
    throw new Error("Toggle inversion failed");
  }

  // Test 7: Admin Toggle Status
  console.log("\n--- Test 7: adminToggleVehicleStatus ---");
  const req7 = mockReq({
    params: { id: vehicle.id },
    body: { isOnline: false }
  });
  const res7 = mockRes();
  await adminToggleVehicleStatus(req7, res7);
  await vehicle.reload();
  console.log("Admin set offline, vehicle.isActive =", vehicle.isActive);
  if (vehicle.isActive !== false) {
    throw new Error("adminToggleVehicleStatus failed to set offline");
  }

  // Set back online for active fleet testing
  const req8 = mockReq({
    params: { id: vehicle.id },
    body: { isOnline: true }
  });
  const res8 = mockRes();
  await adminToggleVehicleStatus(req8, res8);
  await vehicle.reload();
  console.log("Admin set online, vehicle.isActive =", vehicle.isActive);

  console.log("\n=======================================================");
  console.log("🎉 ALL ONLINE / OFFLINE LIFECYCLE TESTS PASSED 100%!");
  console.log("=======================================================");
  process.exit(0);
}

runTests().catch(err => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
