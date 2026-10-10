// src/sync-db.ts
import { db } from "./db";

async function sync() {
  try {
    console.log("🔄 Syncing Database (Safe Alter Mode)...");
    
    await db.sequelize.sync({ alter: true });
    
    console.log("✅ Database Synced Successfully!");

    const rels = [
      { name: 'Self/Admin' },
      { name: 'Father' },
      { name: 'Mother' },
      { name: 'Brother' },
      { name: 'Sister' },
      { name: 'Friend' }
    ];

    for (const rel of rels) {
      await db.Relationship.findOrCreate({
        where: { name: rel.name },
        defaults: rel
      });
    }
    
    console.log("👥 Default Relationships Added!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error syncing database:", error);
    process.exit(1);
  }
}

sync();
