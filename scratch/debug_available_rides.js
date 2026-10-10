require('dotenv').config();
const { db } = require('../dist/db');
const { getNearbyDrivers, getAvailableRides } = require('../dist/modules/taxi/controllers/taxiController');

async function test() {
  try {
    console.log("Testing getNearbyDrivers directly in node...");
    const drivers = await getNearbyDrivers(7.2906, 80.6337, 20, undefined, undefined, false);
    console.log("Success! Drivers found:", drivers.length);
    for (const d of drivers) {
      console.log(`- ${d.vehicleRegNum}: type=${d.vehicleType?.type}, dist=${d.dataValues?.distance || d.distance}`);
    }
  } catch (err) {
    console.error("Direct error in getNearbyDrivers:", err);
  }

  // Also test the controller logic
  try {
    console.log("\nTesting controller handler simulation...");
    const req = {
      query: { pickupLat: '7.2906', pickupLng: '80.6337', radiusKm: '20' },
      user: { userId: 'some-user' }
    };
    const res = {
      status(c) { this.statusCode = c; return this; },
      json(data) { console.log("Response JSON:", data); return this; }
    };
    await getAvailableRides(req, res);
  } catch (err) {
    console.error("Direct controller error:", err);
  }

  process.exit(0);
}

test();
