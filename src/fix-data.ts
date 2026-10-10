import { db } from "./db";

async function fixData() {
  try {
    console.log("🛠️ Repairing Database Integrity...");

    // මේ SQL එකෙන් කරන්නේ "Location එකක් නැති UserLocation රෙකෝඩ්" විතරක් මකන එක.
    // අනිත් ඩේටා ඔක්කොම ආරක්ෂිතයි.
    await db.sequelize.query(`
      DELETE FROM "user_locations"
      WHERE "location_id" NOT IN (SELECT "id" FROM "Locations");
    `);

    console.log("✅ Database Repairs Complete! Orphan records removed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing data:", error);
    process.exit(1);
  }
}

fixData();
