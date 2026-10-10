require('dotenv').config();
const path = require('path');
const { db, sequelize } = require(path.join(__dirname, '../dist/db'));

async function testConn() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB Connection Success');
    const vehicleCount = await db.Vehicle.count();
    console.log('Total vehicles in DB:', vehicleCount);
    const bookingCount = await db.VehicleBooking.count();
    console.log('Total bookings in DB:', bookingCount);
    process.exit(0);
  } catch (err) {
    console.error('❌ DB Connection Error:', err.message);
    process.exit(1);
  }
}

testConn();
