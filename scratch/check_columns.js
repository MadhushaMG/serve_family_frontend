const path = require('path');
const { db } = require(path.join(__dirname, '../dist/db'));

async function check() {
  try {
    const [cols] = await db.sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'taxi_vehicles'");
    console.log("taxi_vehicles columns:", cols.map(c => `${c.column_name} (${c.data_type})`));

    const [bCols] = await db.sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'taxi_vehicle_bookings'");
    console.log("taxi_vehicle_bookings columns:", bCols.map(c => `${c.column_name} (${c.data_type})`));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

check();
