require('dotenv').config();
const path = require('path');
const { db } = require(path.join(__dirname, '../dist/db'));

async function testToggleStatus() {
  console.log('--- TESTING DRIVER STATUS TOGGLE ---');
  // Find an approved vehicle
  const vehicle = await db.Vehicle.findOne({ where: { approvalStatus: 'approved' } });
  if (!vehicle) {
    console.log('No approved vehicle found');
    process.exit(1);
  }

  console.log(`Initial Status: vehicle ${vehicle.vehicleRegNum} isActive=${vehicle.isActive}`);

  // Test setting Offline
  await vehicle.update({ isActive: false, updatedAt: new Date() });
  await vehicle.reload();
  console.log(`After Set Offline: isActive=${vehicle.isActive} (Expected: false)`);
  if (vehicle.isActive !== false) throw new Error('Failed to set offline');

  // Test setting Online
  await vehicle.update({ isActive: true, updatedAt: new Date() });
  await vehicle.reload();
  console.log(`After Set Online: isActive=${vehicle.isActive} (Expected: true)`);
  if (vehicle.isActive !== true) throw new Error('Failed to set online');

  console.log('✅ DRIVER STATUS TOGGLE TEST PASSED SUCCESSFULLY!');
  process.exit(0);
}

testToggleStatus().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
