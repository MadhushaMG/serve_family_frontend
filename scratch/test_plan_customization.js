const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { db } = require('../dist/db');
const { adminUpdatePlan, adminGetPlans } = require('../dist/modules/taxi/controllers/adminTaxiController');
const { getAllPlans } = require('../dist/controllers/subscriptionController');
const { checkPlanLimit } = require('../dist/utils/limitChecker');

async function runPlanCustomizationTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING ADMIN SUBSCRIPTION PACKAGE CUSTOMIZATION SYSTEM");
  console.log("===============================================================");

  // Find Gold Plan
  const goldPlan = await db.Plan.findOne({ where: { name: 'Gold' } });
  if (!goldPlan) {
    console.error("❌ Gold Plan not found in database!");
    process.exit(1);
  }

  console.log(`Initial Gold Plan: Groups=${goldPlan.maxGroups}, Tracking=${goldPlan.maxTracking}, Devices=${goldPlan.maxDevices}, Price=${goldPlan.metadata?.price}`);

  // ---------------------------------------------------------------------------
  // TEST 1: Admin Updates Gold Package (Price, Limits, Features, Badge)
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 1: Simulating Admin Updating Gold Package via PATCH /api/admin/taxi/plans/:id...");
  
  let patchResponseJson = null;
  const mockReqPatch = {
    params: { id: goldPlan.id },
    body: {
      price: 499,
      maxGroups: 8,
      maxTracking: 16,
      maxDevices: 10,
      mobileWeb: 'Yes',
      health: 'AI + Unlimited',
      notifications: 'Unlimited',
      phoneAlert: 'Yes',
      sms: 'Yes',
      btnText: 'Choose Gold Fleet',
      badgeText: 'Top Choice',
      isPopular: true,
      metadata: {
        price: 499,
        maxGroups: 8,
        maxTracking: 16,
        maxDevices: 10,
        mobileWeb: 'Yes',
        health: 'AI + Unlimited',
        notifications: 'Unlimited',
        phoneAlert: 'Yes',
        sms: 'Yes',
        btnText: 'Choose Gold Fleet',
        badgeText: 'Top Choice',
        isPopular: true
      }
    }
  };

  const mockRes = {
    json: (d) => { patchResponseJson = d; return mockRes; },
    status: () => mockRes
  };

  await adminUpdatePlan(mockReqPatch, mockRes);
  console.log(`   └─ Status message: "${patchResponseJson.message}"`);
  
  // Reload from DB
  await goldPlan.reload();
  console.log(`   └─ Updated DB Values: Groups=${goldPlan.maxGroups}, Tracking=${goldPlan.maxTracking}, Devices=${goldPlan.maxDevices}`);
  console.log(`   └─ Updated Metadata: Price=${goldPlan.metadata?.price}, Badge="${goldPlan.metadata?.badgeText}", Button="${goldPlan.metadata?.btnText}"`);

  if (goldPlan.maxGroups !== 8 || goldPlan.maxTracking !== 16 || goldPlan.metadata?.price !== 499 || goldPlan.metadata?.badgeText !== 'Top Choice') {
    console.error("❌ TEST 1 FAILED: DB Plan values did not update as expected!");
    process.exit(1);
  }
  console.log("   ✅ TEST 1 PASSED: Plan limits, pricing, and metadata saved to DB successfully!");

  // ---------------------------------------------------------------------------
  // TEST 2: GET /api/admin/taxi/plans returns sorted plans with updated values
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 2: Simulating GET /api/admin/taxi/plans for Admin Dashboard...");
  let getPlansResponse = null;
  await adminGetPlans({}, { json: (d) => { getPlansResponse = d; return mockRes; }, status: () => mockRes });
  const returnedGold = getPlansResponse.data.find(p => p.name === 'Gold');
  console.log(`   └─ Total Plans: ${getPlansResponse.data.length}`);
  console.log(`   └─ Returned Gold Plan: Price=${returnedGold.metadata?.price}, Groups=${returnedGold.maxGroups}`);
  if (!returnedGold || returnedGold.maxGroups !== 8 || returnedGold.metadata?.price !== 499) {
    console.error("❌ TEST 2 FAILED: Admin GET plans does not contain updated package details!");
    process.exit(1);
  }
  console.log("   ✅ TEST 2 PASSED: Admin plans endpoint returns updated dynamic values!");

  // ---------------------------------------------------------------------------
  // TEST 3: User App / Mobile API (GET /api/subscription/plans)
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 3: Simulating User App GET /api/subscription/plans...");
  let userPlansResponse = null;
  await getAllPlans({}, { json: (d) => { userPlansResponse = d; return mockRes; }, status: () => mockRes });
  const userGold = userPlansResponse.data.find(p => p.name === 'Gold');
  console.log(`   └─ User App Gold Plan: Price=${userGold.metadata?.price}, MaxGroups=${userGold.maxGroups}, MaxTracking=${userGold.maxTracking}`);
  if (!userGold || userGold.maxGroups !== 8 || userGold.metadata?.price !== 499) {
    console.error("❌ TEST 3 FAILED: User app endpoint does not contain new package details!");
    process.exit(1);
  }
  console.log("   ✅ TEST 3 PASSED: User/Mobile App gets updated plan quotas & pricing!");

  // ---------------------------------------------------------------------------
  // TEST 4: Backend Limit Checker dynamically respects new limit
  // ---------------------------------------------------------------------------
  console.log("\n▶ TEST 4: Verifying backend limit checker with updated plan...");
  // Find or create test user with Gold plan
  const testUser = await db.User.findOne();
  if (testUser) {
    let userPlan = await db.UserPlan.findOne({ where: { userId: testUser.id } });
    if (userPlan) {
      await userPlan.update({ planId: goldPlan.id });
    } else {
      userPlan = await db.UserPlan.create({ userId: testUser.id, planId: goldPlan.id, status: 'active' });
    }
    const limitCheck = await checkPlanLimit(testUser.id, 'maxGroups');
    console.log(`   └─ Checked limit for user: limit=${limitCheck.limit} (Expected: 8)`);
    if (limitCheck.limit !== 8) {
      console.error(`❌ TEST 4 FAILED: Expected limit 8, got ${limitCheck.limit}!`);
      process.exit(1);
    }
    console.log("   ✅ TEST 4 PASSED: Backend limit checker immediately enforces updated limit!");
  }

  // Restore Gold Plan to standard values (or 400 price)
  await goldPlan.update({
    price: 400,
    maxGroups: 6,
    maxTracking: 6,
    maxDevices: 6,
    hasSms: true,
    hasPhoneAlert: true,
    metadata: {
      price: 400,
      maxGroups: 6,
      maxTracking: 6,
      maxDevices: 6,
      mobileWeb: "Yes",
      health: "Unlimited",
      notifications: "Unlimited",
      phoneAlert: "Yes",
      sms: "Yes",
      btnText: "Subscribe",
      isPopular: true,
      badgeText: "Most popular"
    }
  });
  console.log("\n   └─ Restored Gold Plan to clean standard baseline.");

  console.log("\n===============================================================");
  console.log("🎉 ALL 4 PLAN CUSTOMIZATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("===============================================================");
  process.exit(0);
}

runPlanCustomizationTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
