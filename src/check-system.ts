import { env } from "./config/env";
import { db } from "./db";
import nodemailer from "nodemailer";

async function runDiagnostics() {
  console.log("🚀 --- SERVE FAMILY SYSTEM DIAGNOSTICS --- 🚀\n");

  // 1. Environment Variables Check
  console.log("📦 Checking Environment Variables...");
  const requiredEnvs = [
    "DATABASE_URL", "JWT_SECRET", "APPLE_CLIENT_ID", 
    "SMTP_HOST", "SMTP_USER", "SMTP_PASS"
  ];
  
  requiredEnvs.forEach(key => {
    const value = (env as any)[key];
    if (value && value !== "") {
      console.log(` ✅ ${key}: Configured`);
    } else {
      console.log(` ❌ ${key}: MISSING OR EMPTY`);
    }
  });

  // 2. Database Connectivity & Enum Check
  console.log("\n🗄️ Checking Database Connection...");
  try {
    await db.sequelize.authenticate();
    console.log(" ✅ Database Connection: SUCCESS");

    // SOS Enum එක තියෙනවද බලමු
    const [results]: any = await db.sequelize.query(
      "SELECT enum_range(NULL::enum_notifications_type)"
    );
    const enums = results[0].enum_range;
    console.log(` ℹ️  Notification Enums: ${enums}`);
    
    if (enums.includes("sos_alert")) {
      console.log(" ✅ 'sos_alert' Enum: FOUND");
    } else {
      console.log(" ❌ 'sos_alert' Enum: MISSING (Run the ALTER TYPE query!)");
    }
  } catch (error: any) {
    console.error(" ❌ Database Error:", error.message);
  }

  // 3. Email Service Check
  console.log("\n📧 Checking Email SMTP Configuration...");
  if (!env.SMTP_HOST) {
    console.log(" ❌ SMTP_HOST is not defined in env.");
  } else {
    const testTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    try {
      await testTransporter.verify();
      console.log(" ✅ SMTP Server Connection: SUCCESS");
    } catch (error: any) {
      console.error(" ❌ SMTP Error:", error.message);
    }
  }

  console.log("\n--- DIAGNOSTICS COMPLETE ---");
  process.exit();
}

runDiagnostics();
