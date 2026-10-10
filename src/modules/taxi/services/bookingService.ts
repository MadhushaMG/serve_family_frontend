import { Op } from "sequelize";
import { db } from "../../../db";
import { sequelize } from "../../../db/sequelize";

export const processRideRequest = async (bookingId: string, lat: number, lng: number, excludeUserId?: string) => {
  const safeLat = Number(lat);
  const safeLng = Number(lng);
  const cosFormula = `cos(radians(${safeLat})) * cos(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906))) * cos(radians(COALESCE(NULLIF("Vehicle"."longitude", 0), NULLIF("driver"."longitude", 0), NULLIF("Vehicle"."base_longitude", 0), 80.6337)) - radians(${safeLng})) + sin(radians(${safeLat})) * sin(radians(COALESCE(NULLIF("Vehicle"."latitude", 0), NULLIF("driver"."latitude", 0), NULLIF("Vehicle"."base_latitude", 0), 7.2906)))`;
  const distanceFormula = `(6371 * acos(LEAST(1.0, GREATEST(-1.0, ${cosFormula}))))`;

  const whereClause: any = {
    approvalStatus: 'approved',
    isActive: true
  };
  if (excludeUserId) {
    whereClause.userId = { [Op.ne]: excludeUserId };
  }

  const maxRadiusKm = 25;

  const nearbyDrivers = await db.Vehicle.findAll({
    attributes: [
      'id', 'userId', 'isActive',
      [sequelize.literal(distanceFormula), 'distance']
    ],
    include: [
      {
        model: db.User,
        as: 'driver',
        attributes: ['id', 'latitude', 'longitude', 'updatedAt'],
        required: false
      }
    ],
    where: sequelize.and(
      whereClause,
      sequelize.where(sequelize.literal(distanceFormula), '<=', maxRadiusKm)
    ),
    order: sequelize.literal('distance ASC'),
    limit: 10
  });

  return nearbyDrivers;
};
