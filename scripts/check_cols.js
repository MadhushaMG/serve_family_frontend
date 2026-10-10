const { db } = require('../dist/db');
async function run() {
  const vehicles = await db.Vehicle.findAll({
    include: [{ model: db.User, as: 'driver', attributes: ['name', 'phoneNumber'] }],
    limit: 5
  });
  console.log('Total sample vehicles:', vehicles.length);
  vehicles.forEach(v => {
    console.log(`- ID: ${v.id}, Plate: ${v.vehicleRegNum}, Driver: ${v.driver?.name}, Phone: ${v.driver?.phoneNumber || v.mobileNum}, Status: ${v.approvalStatus}`);
  });
  process.exit(0);
}

run();