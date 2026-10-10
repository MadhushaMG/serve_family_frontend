const { db } = require('../dist/db');

async function main() {
  try {
    console.log("=== AGENTS ===");
    const agents = await db.Agent.findAll();
    console.log(agents.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      locationName: a.locationName,
      district: a.district,
      province: a.province,
      coverageArea: a.coverageArea,
      dsds: a.dsds
    })));

    console.log("\n=== VEHICLES (Sample) ===");
    const vehicles = await db.Vehicle.findAll({
      limit: 20,
      include: [
        { model: db.User, as: 'driver', attributes: ['id', 'name', 'email', 'phoneNumber', 'metadata'] }
      ]
    });
    console.log(vehicles.map(v => ({
      id: v.id,
      reg: v.vehicleRegNum,
      agentId: v.agentId,
      baseAddress: v.baseAddress,
      approvalStatus: v.approvalStatus,
      driverName: v.driver?.name,
      driverPhone: v.driver?.phoneNumber,
      driverMeta: v.driver?.metadata
    })));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
