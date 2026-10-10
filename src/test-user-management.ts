import app from "./app";
import http from "http";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { db } from "./db";

async function testUserManagement() {
  console.log("🛠️ Testing Complete Admin User Management & Mapbox Endpoints...\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3994, resolve));
  const baseUrl = "http://localhost:3994";

  // Admin token
  const [adminUser] = await db.User.findOrCreate({
    where: { email: "admin_mgmt_test@servefamily.com" },
    defaults: { name: "Admin Mgmt", email: "admin_mgmt_test@servefamily.com", emailVerified: true }
  });

  const token = jwt.sign({ userId: adminUser.id }, env.JWT_SECRET as string, { expiresIn: "1h" });
  const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  // 1. Fetch Users with Password
  console.log("1. Testing GET /api/admin/taxi/users (Including Password attributes)...");
  const usersRes = await fetch(`${baseUrl}/api/admin/taxi/users`, { headers });
  const usersData = await usersRes.json();
  console.log("   Status:", usersRes.status, "Total Users Returned:", usersData.data?.length);

  // Create dummy test user to edit & delete
  const testUser = await db.User.create({
    name: "User To Mgmt",
    email: `test_mgmt_${Date.now()}@example.com`,
    password: "dummyPasswordHash123",
    emailVerified: false,
    phoneVerified: false,
    isTracker: false
  });

  // 2. Update User Profile
  console.log(`\n2. Testing PATCH /api/admin/taxi/users/${testUser.id}...`);
  const updateRes = await fetch(`${baseUrl}/api/admin/taxi/users/${testUser.id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      name: "User Updated Successfully",
      emailVerified: true,
      phoneVerified: true,
      isTracker: true
    })
  });
  const updateData = await updateRes.json();
  console.log("   Status:", updateRes.status, "Response:", updateData);

  // 3. Reset Password
  console.log(`\n3. Testing POST /api/admin/taxi/users/${testUser.id}/reset-password...`);
  const resetRes = await fetch(`${baseUrl}/api/admin/taxi/users/${testUser.id}/reset-password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ newPassword: "UpdatedNewPassword999!" })
  });
  const resetData = await resetRes.json();
  console.log("   Status:", resetRes.status, "Response:", resetData);

  // 4. Delete User
  console.log(`\n4. Testing DELETE /api/admin/taxi/users/${testUser.id}...`);
  const deleteRes = await fetch(`${baseUrl}/api/admin/taxi/users/${testUser.id}`, {
    method: "DELETE",
    headers
  });
  const deleteData = await deleteRes.json();
  console.log("   Status:", deleteRes.status, "Response:", deleteData);

  server.close();
  process.exit(0);
}

testUserManagement().catch(err => {
  console.error("User management test crash:", err);
  process.exit(1);
});
