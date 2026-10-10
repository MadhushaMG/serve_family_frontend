import models, { sequelize } from "./models";
import { Relationship } from "./models/Relationship";
import { Payment } from "./models/Payment";
import { CirclePrivacy } from "./models/CirclePrivacy";


import { VehicleType } from "../modules/taxi/models/VehicleType";
import { Vehicle } from "../modules/taxi/models/Vehicle";
import { VehicleImage } from "../modules/taxi/models/VehicleImage";
import { DriverDocument } from "../modules/taxi/models/DriverDocument";
import { VehicleBooking } from "../modules/taxi/models/VehicleBooking";
import { Review } from "../modules/taxi/models/Review";
import { Agent } from "../modules/taxi/models/Agent";
import { SystemSetting } from "../modules/taxi/models/SystemSetting";
import { AdminAuditLog } from "../modules/taxi/models/AdminAuditLog";


export const db = {
  ...models,
  Relationship,
  Payment,
  sequelize,
  CirclePrivacy,
  VehicleType,
  Vehicle,
  VehicleImage,
  DriverDocument,
  VehicleBooking,
  Review,
  Agent,
  SystemSetting,
  AdminAuditLog,
};

db.Relationship.hasMany(db.Membership, { foreignKey: "relationship_id" });
db.Membership.belongsTo(db.Relationship, { foreignKey: "relationship_id", as: "relationInfo" });

db.User.hasMany(db.Payment, { foreignKey: "user_id", as: "payments" });
db.Payment.belongsTo(db.User, { foreignKey: "user_id", as: "user" });

db.Plan.hasMany(db.Payment, { foreignKey: "plan_id", as: "payments" });
db.Payment.belongsTo(db.Plan, { foreignKey: "plan_id", as: "plan" });



db.User.hasMany(db.CirclePrivacy, { foreignKey: 'user_id' });
db.CirclePrivacy.belongsTo(db.User, { foreignKey: 'user_id' });

db.Circle.hasMany(db.CirclePrivacy, { foreignKey: 'circle_id' });
db.CirclePrivacy.belongsTo(db.Circle, { foreignKey: 'circle_id' });




// ==========================================
// TAXI MODULE RELATIONSHIPS
// ==========================================

// User -> Vehicle
db.User.hasMany(db.Vehicle, { foreignKey: 'user_id', as: 'vehicles' });
db.Vehicle.belongsTo(db.User, { foreignKey: 'user_id', as: 'driver' });

// VehicleType -> Vehicle
db.VehicleType.hasMany(db.Vehicle, { foreignKey: 'vehicle_type_id', as: 'vehicles' });
db.Vehicle.belongsTo(db.VehicleType, { foreignKey: 'vehicle_type_id', as: 'vehicleType' });

// Vehicle -> VehicleImage
db.Vehicle.hasOne(db.VehicleImage, { foreignKey: 'vehicle_id', as: 'images' });
db.VehicleImage.belongsTo(db.Vehicle, { foreignKey: 'vehicle_id' });

// User -> DriverDocument (NIC/License)
db.User.hasMany(db.DriverDocument, { foreignKey: 'user_id', as: 'documents' });
db.DriverDocument.belongsTo(db.User, { foreignKey: 'user_id' });

// Booking Relationships
db.User.hasMany(db.VehicleBooking, { foreignKey: 'user_id', as: 'rides' }); // Passenger
db.VehicleBooking.belongsTo(db.User, { foreignKey: 'user_id', as: 'passenger' });

db.Vehicle.hasMany(db.VehicleBooking, { foreignKey: 'vehicle_id', as: 'bookings' });
db.VehicleBooking.belongsTo(db.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });

// Review Relationships
db.VehicleBooking.hasOne(db.Review, { foreignKey: 'booking_id', as: 'review' });
db.Review.belongsTo(db.VehicleBooking, { foreignKey: 'booking_id' });

db.Vehicle.hasMany(db.Review, { foreignKey: 'vehicle_id', as: 'reviews' });
db.Review.belongsTo(db.Vehicle, { foreignKey: 'vehicle_id' });

db.User.hasMany(db.Review, { foreignKey: 'user_id', as: 'givenReviews' });
db.Review.belongsTo(db.User, { foreignKey: 'user_id', as: 'reviewer' });



// Agent Relationships
db.Agent.hasMany(db.Vehicle, { foreignKey: 'agent_id', as: 'vehicles' });
db.Vehicle.belongsTo(db.Agent, { foreignKey: 'agent_id', as: 'agent' });

export { sequelize };

export default db;
