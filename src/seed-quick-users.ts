import dotenv from "dotenv";
dotenv.config();

import { db, sequelize } from "./db";
import bcrypt from "bcrypt";

async function run() {
  try {
    console.log("🌱 Fast seeding admin users...");
    await sequelize.authenticate();
    console.log("✅ DB Connected");

    const passwordHash = await bcrypt.hash("123456", 10);

    const [admin1] = await db.User.findOrCreate({
      where: { email: "madhu@test.com" },
      defaults: {
        name: "Madhu Admin",
        email: "madhu@test.com",
        password: passwordHash,
        phoneNumber: "0712345678",
        emailVerified: true,
        phoneVerified: true,
      }
    });
    await admin1.update({ password: passwordHash, emailVerified: true });

    const [admin2] = await db.User.findOrCreate({
      where: { email: "admin@test.com" },
      defaults: {
        name: "Taxi Admin",
        email: "admin@test.com",
        password: passwordHash,
        phoneNumber: "0770000000",
        emailVerified: true,
        phoneVerified: true,
      }
    });
    await admin2.update({ password: passwordHash, emailVerified: true });

    console.log("✅ Admin users seeded & passwords updated to 123456!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Quick Seed Error:", err);
    process.exit(1);
  }
}

run();
