const { db } = require('../dist/db');
const { sequelize } = require('../dist/db/sequelize');

async function test() {
  const safeLat = 6.9271;
  const safeLng = 79.8612;
  const cosFormula = `cos(radians(${safeLat})) * cos(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906))) * cos(radians(COALESCE(NULLIF("Vehicle"."longitude", 0), NULLIF("driver"."longitude", 0), NULLIF("Vehicle"."base_longitude", 0), 80.6337)) - radians(${safeLng})) + sin(radians(${safeLat})) * sin(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906)))`;
  const dist = `(6371 * acos(LEAST(1.0, GREATEST(-1.0, ${cosFormula}))))`;

  const results = await db.Vehicle.findAll({
    attributes: ['id', 'vehicleRegNum', [sequelize.literal(dist), 'distance']],
    include: [{ model: db.User, as: 'driver', attributes: ['id', 'latitude', 'longitude'] }],
    limit: 5
  });

  console.log('Successfully queried! Results count:', results.length);
  results.forEach(r => console.log(r.toJSON()));
  process.exit(0);
}

test().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
