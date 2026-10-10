const { db } = require('../dist/db');
const { getNearbyDrivers } = require('../dist/modules/taxi/controllers/taxiController');
const { isDriverSocketConnected, markDriverUserConnected, markDriverUserDisconnected } = require('../dist/socket');

async function runTests() {
  console.log("🚀 Starting Driver Account Online Verification Tests...");

  // 1. Pick a driver with an approved vehicle (e.g. Kamal Perera / WP-5678)
  const vehicle = await db.Vehicle.findOne({
    where: { vehicleRegNum: 'WP-5678', approvalStatus: 'approved' },
    include: [{ model: db.User, as: 'driver' }]
  });

  if (!vehicle) {
    console.error("❌ Vehicle WP-5678 not found!");
    process.exit(1);
  }

  console.log(`Found target vehicle: ${vehicle.vehicleRegNum}, Driver: ${vehicle.driver?.name}`);

  // Test Case A: Even if vehicle.isActive is explicitly false, if driver user account has GPS coordinates:
  await vehicle.update({ isActive: false, latitude: null, longitude: null });
  await db.User.update(
    { latitude: 6.9271, longitude: 79.8612, updatedAt: new Date() },
    { where: { id: vehicle.userId } }
  );

  console.log("Test Case A: Set vehicle.isActive=false, driver user has active GPS (6.9271, 79.8612)");

  const nearby = await getNearbyDrivers(6.9271, 79.8612, 15, undefined, undefined, true);
  const foundInNearby = nearby.find(v => v.id === vehicle.id);

  if (!foundInNearby) {
    console.error("❌ Test Case A Failed: Vehicle not found in nearby drivers when driver account has GPS!");
    process.exit(1);
  }
  console.log("✅ Test Case A Passed: Vehicle successfully discovered in getNearbyDrivers via driver user account GPS!");

  // Test Case B: Socket connection tracking
  console.log("Test Case B: Testing socket connection tracking");
  markDriverUserConnected(vehicle.userId, "mock_socket_123");
  const isConnected = isDriverSocketConnected(vehicle.userId);
  if (!isConnected) {
    console.error("❌ Test Case B Failed: Socket connection not tracked in memory!");
    process.exit(1);
  }
  console.log("✅ Test Case B Passed: Socket connection accurately tracked!");

  markDriverUserDisconnected(vehicle.userId, "mock_socket_123");
  const isDisconnected = !isDriverSocketConnected(vehicle.userId);
  if (!isDisconnected) {
    console.error("❌ Test Case B Failed: Socket disconnection not tracked!");
    process.exit(1);
  }
  console.log("✅ Test Case B Passed: Socket disconnect successfully untracked!");

  // Test Case C: adminGetVehicles returns driver GPS & isOnline
  const { adminGetAllVehicles } = require('../dist/modules/taxi/controllers/adminTaxiController');
  console.log("Test Case C: Testing admin vehicle listing");
  let adminResData = null;
  const mockRes = {
    json: (payload) => { adminResData = payload; return mockRes; },
    status: () => mockRes
  };
  const mockReq = {
    query: { limit: '50', page: '1' },
    user: { userId: '1c811f24-37d4-41c2-90f2-3170ecf0580d', role: 'admin', isAgent: false }
  };

  await adminGetAllVehicles(mockReq, mockRes);

  if (!adminResData || !adminResData.data) {
    console.error("❌ Test Case C Failed: adminGetVehicles returned invalid payload!");
    process.exit(1);
  }

  const adminVehicle = adminResData.data.find(v => v.id === vehicle.id);
  if (!adminVehicle) {
    console.error("❌ Test Case C Failed: Vehicle not found in adminGetVehicles!");
    process.exit(1);
  }

  if (adminVehicle.dataValues.isOnline !== true && adminVehicle.isOnline !== true) {
    console.error("❌ Test Case C Failed: Vehicle isOnline flag was not true for online driver account!");
    process.exit(1);
  }
  console.log(`✅ Test Case C Passed: Vehicle in admin dashboard has isOnline = ${adminVehicle.dataValues.isOnline || adminVehicle.isOnline}`);

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Driver account online status is fully decoupled from manual toggle!");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
