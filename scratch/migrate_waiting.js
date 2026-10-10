const path = require('path');
const { db } = require(path.join(__dirname, '../dist/db'));

async function migrate() {
  try {
    console.log("Adding waiting columns to taxi_vehicles...");
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS waiting_fare DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT false;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicles 
      ADD COLUMN IF NOT EXISTS waiting_started_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log("Adding waiting columns to taxi_vehicle_bookings...");
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS is_waiting BOOLEAN DEFAULT false;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_minutes DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_fare DOUBLE PRECISION DEFAULT 0;
    `);
    await db.sequelize.query(`
      ALTER TABLE taxi_vehicle_bookings 
      ADD COLUMN IF NOT EXISTS waiting_started_at TIMESTAMP WITH TIME ZONE;
    `);

    console.log("Migration executed successfully!");

    const [cols] = await db.sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'taxi_vehicles' AND column_name IN ('waiting_fare', 'is_waiting', 'waiting_started_at')");
    console.log("Added columns in taxi_vehicles:", cols);

    const [bCols] = await db.sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'taxi_vehicle_bookings' AND column_name IN ('waiting_fare', 'is_waiting', 'waiting_minutes', 'waiting_started_at')");
    console.log("Added columns in taxi_vehicle_bookings:", bCols);
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    process.exit(0);
  }
}

migrate();
