const path = require('path');
const { db } = require(path.join(process.cwd(), 'dist', 'db'));

async function fixData() {
  try {
    console.log("=== FIXING VEHICLE TYPES & COORDINATES ===");

    const tukType = await db.VehicleType.findOne({ where: { type: 'Tuk' } });
    if (!tukType) {
      console.error("Tuk vehicle type not found in database!");
      process.exit(1);
    }
    console.log(`Tuk VehicleType ID: ${tukType.id}`);

    // 1. Fix WP-7788 and WP-8899 vehicle type to Tuk
    const misclassifiedTuks = await db.Vehicle.findAll({
      where: {
        vehicleRegNum: ['WP-7788', 'WP-8899']
      }
    });

    for (const v of misclassifiedTuks) {
      console.log(`Fixing ${v.vehicleRegNum} from type ${v.vehicleTypeId} to Tuk (${tukType.id})...`);
      await v.update({ vehicleTypeId: tukType.id });
    }

    // 2. Fix NULL coordinates on all approved vehicles
    const allVehicles = await db.Vehicle.findAll();
    for (const v of allVehicles) {
      const updates = {};
      
      // If base coordinates are missing, resolve from baseAddress
      if (v.baseLatitude == null || v.baseLongitude == null) {
        const addr = (v.baseAddress || '').toLowerCase();
        if (addr.includes('kandy')) {
          updates.baseLatitude = 7.2906;
          updates.baseLongitude = 80.6337;
        } else if (addr.includes('galle')) {
          updates.baseLatitude = 6.0535;
          updates.baseLongitude = 80.2210;
        } else {
          // Default to Colombo or Kandy
          updates.baseLatitude = 7.2906;
          updates.baseLongitude = 80.6337;
        }
        console.log(`Assigned base coordinates to ${v.vehicleRegNum}: (${updates.baseLatitude}, ${updates.baseLongitude})`);
      }

      // If live coordinates are missing, copy base coordinates so driver shows up immediately
      if (v.latitude == null || v.longitude == null) {
        updates.latitude = updates.baseLatitude || v.baseLatitude;
        updates.longitude = updates.baseLongitude || v.baseLongitude;
        console.log(`Assigned live coordinates to ${v.vehicleRegNum}: (${updates.latitude}, ${updates.longitude})`);
      }

      if (Object.keys(updates).length > 0) {
        await v.update(updates);
      }
    }

    const updated = await db.Vehicle.findAll({
      include: [{ model: db.VehicleType, as: 'vehicleType' }]
    });
    console.log("\nUpdated vehicle state in DB:");
    console.log(updated.map(v => ({
      reg: v.vehicleRegNum,
      type: v.vehicleType?.type,
      status: v.approvalStatus,
      active: v.isActive,
      lat: v.latitude,
      lng: v.longitude,
      baseLat: v.baseLatitude,
      baseLng: v.baseLongitude,
      address: v.baseAddress
    })));

    console.log("\n✅ Database records fixed successfully!");
  } catch (err) {
    console.error("Fix error:", err);
  } finally {
    process.exit(0);
  }
}

fixData();
