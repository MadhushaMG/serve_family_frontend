const { db } = require('../dist/db');
const { 
  getPassengerBookings, 
  getDriverBookings, 
  getDriverEarningsSummary, 
  getBookingReceipt, 
  buildBookingReceipt 
} = require('../dist/modules/taxi/controllers/taxiController');
const { 
  adminGetAllBookings, 
  adminGetWalletsAndEarnings 
} = require('../dist/modules/taxi/controllers/adminTaxiController');

async function testBillingAndHistory() {
  console.log("===============================================================");
  console.log("🧪 TESTING BILLING HISTORY, RIDE HISTORY & RECEIPTS");
  console.log("===============================================================");

  // Find a completed booking for verification
  const completedBooking = await db.VehicleBooking.findOne({
    where: { status: 'completed' },
    include: [
      { model: db.Vehicle, as: 'vehicle', include: [{ model: db.User, as: 'driver' }, { model: db.VehicleType, as: 'vehicleType' }] },
      { model: db.User, as: 'passenger' }
    ]
  });

  if (!completedBooking) {
    console.error("❌ No completed booking found in DB for testing!");
    process.exit(1);
  }

  const passengerId = completedBooking.userId;
  const driverUserId = completedBooking.vehicle?.userId;

  console.log(`Target Booking: ${completedBooking.id}`);
  console.log(`Passenger: ${completedBooking.passenger?.name} (${passengerId})`);
  console.log(`Driver: ${completedBooking.vehicle?.driver?.name} (${driverUserId})`);

  // -------------------------------------------------------------
  // TEST 1: Passenger Ride History
  // -------------------------------------------------------------
  console.log("\n▶ TEST 1: Passenger Ride History (/api/taxi/my-bookings)");
  let pResData = null;
  const mockPRes = {
    json: (p) => { pResData = p; return mockPRes; },
    status: () => mockPRes
  };
  const mockPReq = {
    user: { userId: passengerId },
    query: {}
  };

  await getPassengerBookings(mockPReq, mockPRes);
  if (!pResData || !pResData.success || !Array.isArray(pResData.data)) {
    console.error("❌ Test 1 Failed: Invalid passenger bookings response", pResData);
    process.exit(1);
  }

  const pBooking = pResData.data.find(b => b.id === completedBooking.id);
  if (!pBooking) {
    console.error("❌ Test 1 Failed: Completed booking not found in passenger history!");
    process.exit(1);
  }
  if (!pBooking.receipt || !pBooking.invoiceNo || pBooking.receipt.totalFare <= 0) {
    console.error("❌ Test 1 Failed: Itemized receipt not attached to passenger booking history!", pBooking);
    process.exit(1);
  }
  console.log(`  ✅ Passenger Ride History Passed! Found ${pResData.data.length} ride(s).`);
  console.log(`     └─ Invoice: ${pBooking.invoiceNo}, Total: LKR ${pBooking.receipt.totalFare}, Status: ${pBooking.receipt.status}`);

  // -------------------------------------------------------------
  // TEST 2: Driver Ride History
  // -------------------------------------------------------------
  console.log("\n▶ TEST 2: Driver Ride History (/api/taxi/driver/bookings)");
  let dResData = null;
  const mockDRes = {
    json: (p) => { dResData = p; return mockDRes; },
    status: () => mockDRes
  };
  const mockDReq = {
    user: { userId: driverUserId },
    query: { status: 'completed' }
  };

  await getDriverBookings(mockDReq, mockDRes);
  if (!dResData || !dResData.success || !Array.isArray(dResData.data)) {
    console.error("❌ Test 2 Failed: Invalid driver bookings response", dResData);
    process.exit(1);
  }

  const dBooking = dResData.data.find(b => b.id === completedBooking.id);
  if (!dBooking) {
    console.error("❌ Test 2 Failed: Completed booking not found in driver history!");
    process.exit(1);
  }
  if (!dBooking.receipt || dBooking.receipt.driverEarnings <= 0) {
    console.error("❌ Test 2 Failed: Driver earnings not in receipt!", dBooking);
    process.exit(1);
  }
  console.log(`  ✅ Driver Ride History Passed! Found ${dResData.data.length} completed ride(s).`);
  console.log(`     └─ Driver Net: LKR ${dBooking.receipt.driverEarnings}, Commission: LKR ${dBooking.receipt.companyCommission}`);

  // -------------------------------------------------------------
  // TEST 3: Driver Wallet & Earnings Summary
  // -------------------------------------------------------------
  console.log("\n▶ TEST 3: Driver Earnings Summary & Wallet (/api/taxi/driver/earnings)");
  let earnResData = null;
  const mockEarnRes = {
    json: (p) => { earnResData = p; return mockEarnRes; },
    status: () => mockEarnRes
  };
  const mockEarnReq = {
    user: { userId: driverUserId }
  };

  await getDriverEarningsSummary(mockEarnReq, mockEarnRes);
  if (!earnResData || !earnResData.success || !earnResData.data) {
    console.error("❌ Test 3 Failed: Invalid driver earnings response", earnResData);
    process.exit(1);
  }

  const earnData = earnResData.data;
  console.log(`  ✅ Driver Earnings Passed!`);
  console.log(`     └─ Total Rides: ${earnData.total.rides}, Gross: LKR ${earnData.total.grossFare}`);
  console.log(`     └─ Net Earnings (90%): LKR ${earnData.total.netEarnings}, Platform Commission (10%): LKR ${earnData.total.companyCommission}`);
  console.log(`     └─ Recent Rides Count: ${earnData.recentRides.length}`);

  // -------------------------------------------------------------
  // TEST 4: Itemized Official Receipt / Bill API
  // -------------------------------------------------------------
  console.log("\n▶ TEST 4: Official Receipt / Bill (/api/taxi/booking/:id/receipt)");
  let receiptResData = null;
  const mockReceiptRes = {
    json: (p) => { receiptResData = p; return mockReceiptRes; },
    status: () => mockReceiptRes
  };
  const mockReceiptReq = {
    user: { userId: passengerId },
    params: { bookingId: completedBooking.id }
  };

  await getBookingReceipt(mockReceiptReq, mockReceiptRes);
  if (!receiptResData || !receiptResData.success || !receiptResData.data) {
    console.error("❌ Test 4 Failed: Invalid receipt response", receiptResData);
    process.exit(1);
  }

  const receipt = receiptResData.data;
  console.log(`  ✅ Official Receipt API Passed!`);
  console.log(`     └─ Invoice: ${receipt.invoiceNo}`);
  console.log(`     └─ Base Fare: LKR ${receipt.baseFare}, Rate/km: LKR ${receipt.ratePerKm}, Distance: ${receipt.distanceKm} km`);
  console.log(`     └─ Waiting: ${receipt.waitingMinutes} min (LKR ${receipt.waitingFare})`);
  console.log(`     └─ Total Fare: LKR ${receipt.totalFare}, Payment: ${receipt.paymentMethod} (${receipt.paymentStatus})`);

  // -------------------------------------------------------------
  // TEST 5: Admin Trips & Bookings
  // -------------------------------------------------------------
  console.log("\n▶ TEST 5: Admin Trips & Bookings List (/api/admin/taxi/bookings)");
  let adminBData = null;
  const mockAdminBRes = {
    json: (p) => { adminBData = p; return mockAdminBRes; },
    status: () => mockAdminBRes
  };
  const mockAdminBReq = {
    user: { userId: passengerId, role: 'admin' },
    query: { limit: '10' }
  };

  await adminGetAllBookings(mockAdminBReq, mockAdminBRes);
  if (!adminBData || !adminBData.success || !Array.isArray(adminBData.data)) {
    console.error("❌ Test 5 Failed: Invalid admin bookings response", adminBData);
    process.exit(1);
  }
  console.log(`  ✅ Admin Trips Passed!`);
  console.log(`     └─ Total Bookings Count: ${adminBData.total}, Stats Total: ${adminBData.stats?.total}`);
  console.log(`     └─ Total Revenue: LKR ${adminBData.stats?.totalRevenue}, Commission: LKR ${adminBData.stats?.totalCommission}`);

  // -------------------------------------------------------------
  // TEST 6: Admin Wallets & Earnings
  // -------------------------------------------------------------
  console.log("\n▶ TEST 6: Admin Wallets & Driver Payouts (/api/admin/taxi/wallets)");
  let adminWData = null;
  const mockAdminWRes = {
    json: (p) => { adminWData = p; return mockAdminWRes; },
    status: () => mockAdminWRes
  };
  const mockAdminWReq = {
    user: { userId: passengerId, role: 'admin' }
  };

  await adminGetWalletsAndEarnings(mockAdminWReq, mockAdminWRes);
  if (!adminWData || !adminWData.success || !Array.isArray(adminWData.data)) {
    console.error("❌ Test 6 Failed: Invalid admin wallets response", adminWData);
    process.exit(1);
  }
  console.log(`  ✅ Admin Wallets Passed!`);
  console.log(`     └─ Total Drivers: ${adminWData.summary?.totalDrivers}`);
  console.log(`     └─ Grand Total Gross: LKR ${adminWData.summary?.totalGrossEarnings}`);
  console.log(`     └─ Grand Total Commission: LKR ${adminWData.summary?.totalPlatformCommission}`);

  console.log("\n===============================================================");
  console.log("🎉 ALL 6 BILLING & RIDE HISTORY TESTS PASSED 100%!");
  console.log("===============================================================");
  process.exit(0);
}

testBillingAndHistory().catch(err => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
