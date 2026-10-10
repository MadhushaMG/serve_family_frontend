import { db } from "./db";

async function addRadiusColumn() {
  try {
    console.log("🛠️ Adding 'radius' column to Locations table...");
    
    // 1. අලුත් Column එක හදනවා (Default 100 දාලා)
    await db.sequelize.query(`
      ALTER TABLE "Locations" 
      ADD COLUMN IF NOT EXISTS "radius" INTEGER DEFAULT 100;
    `);

    // 2. දැනටමත් metadata එකේ radius තියෙන ඒවගේ අගය අලුත් column එකට copy කරනවා (Migration)
    await db.sequelize.query(`
      UPDATE "Locations"
      SET "radius" = CAST((metadata->>'radius') AS INTEGER)
      WHERE metadata->>'radius' IS NOT NULL;
    `);

    console.log("✅ 'radius' column added and data migrated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding column:", error);
    process.exit(1);
  }
}

addRadiusColumn();
