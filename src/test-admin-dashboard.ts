import app from "./app";
import http from "http";
import jwt from "jsonwebtoken";
import { env } from "./config/env";
import { db } from "./db";

async function testAdminDashboard() {
  console.log("🛠️ Testing Admin Dashboard Features & Endpoints...\n");

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3992, resolve));
  const baseUrl = "http://localhost:3992";

  // Create an admin user for testing
  const [adminUser] = await db.User.findOrCreate({
    where: { email: "admin_test_dashboard@servefamily.com" },
    defaults: {
      name: "Super Admin",
      email: "admin_test_dashboard@servefamily.com",
      emailVerified: true
    }
  });

  const token = jwt.sign({ userId: adminUser.id }, env.JWT_SECRET as string, { expiresIn: "1h" });
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // 1. Test Admin Executive Stats (Registered Users, Taxi Count, Active Drivers, Pending)
  console.log("1. Testing GET /api/admin/taxi/stats...");
  const statsRes = await fetch(`${baseUrl}/api/admin/taxi/stats`, { headers });
  const statsData = await statsRes.json();
  console.log("   Status:", statsRes.status, "Stats:", statsData.data);

  // 2. Test Admin Get Users (with Email/Phone verification flags)
  console.log("\n2. Testing GET /api/admin/taxi/users...");
  const usersRes = await fetch(`${baseUrl}/api/admin/taxi/users`, { headers });
  const usersData = await usersRes.json();
  console.log("   Status:", usersRes.status, "Users Total:", usersData.data?.length);

  // 3. Test Admin Reset Password for User
  if (usersData.data && usersData.data.length > 0) {
    const targetUser = usersData.data[0];
    console.log(`\n3. Testing Admin Reset Password for user: ${targetUser.email || targetUser.name}...`);
    const resetRes = await fetch(`${baseUrl}/api/admin/taxi/users/${targetUser.id}/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ newPassword: "newAdminResetPassword123!" })
    });
    const resetData = await resetRes.json();
    console.log("   Status:", resetRes.status, "Response:", resetData);
  }

  server.close();
  process.exit(0);
}

testAdminDashboard().catch(err => {
  console.error("Admin dashboard test crash:", err);
  process.exit(1);
});
