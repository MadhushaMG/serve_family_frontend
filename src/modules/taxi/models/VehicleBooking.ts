import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface VehicleBookingAttributes {
  id: string;
  userId: string;          // Ride (Passenger)
  vehicleId: string | null;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
  distance: number;       
  fare: number;          
  status: "pending" | "accepted" | "arrived" | "in_transit" | "completed" | "cancelled";
  cancellationReason?: string | null;
  isWaiting?: boolean;
  waitingMinutes?: number | null;
  waitingFare?: number | null;
  waitingStartedAt?: Date | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  driverEarnings?: number | null;
  companyCommission?: number | null;
  vehicle?: any;
  passenger?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleBookingCreationAttributes extends Optional<VehicleBookingAttributes, "id" | "vehicleId" | "status" | "cancellationReason" | "isWaiting" | "waitingMinutes" | "waitingFare" | "waitingStartedAt" | "paymentMethod" | "paymentStatus" | "driverEarnings" | "companyCommission" | "createdAt" | "updatedAt"> {}

export class VehicleBooking extends Model<VehicleBookingAttributes, VehicleBookingCreationAttributes> implements VehicleBookingAttributes {
  declare id: string;
  declare userId: string;
  declare vehicleId: string | null;
  declare pickupLat: number;
  declare pickupLng: number;
  declare pickupAddress: string;
  declare dropLat: number;
  declare dropLng: number;
  declare dropAddress: string;
  declare distance: number;
  declare fare: number;
  declare status: "pending" | "accepted" | "arrived" | "in_transit" | "completed" | "cancelled";
  declare cancellationReason: string | null;
  declare isWaiting: boolean;
  declare waitingMinutes: number | null;
  declare waitingFare: number | null;
  declare waitingStartedAt: Date | null;
  declare paymentMethod: string | null;
  declare paymentStatus: string | null;
  declare driverEarnings: number | null;
  declare companyCommission: number | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

VehicleBooking.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    vehicleId: { type: DataTypes.UUID, allowNull: true },
    pickupLat: { type: DataTypes.FLOAT, allowNull: false },
    pickupLng: { type: DataTypes.FLOAT, allowNull: false },
    pickupAddress: { type: DataTypes.STRING, allowNull: false },
    dropLat: { type: DataTypes.FLOAT, allowNull: false },
    dropLng: { type: DataTypes.FLOAT, allowNull: false },
    dropAddress: { type: DataTypes.STRING, allowNull: false },
    distance: { type: DataTypes.FLOAT, allowNull: false },
    fare: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "arrived", "in_transit", "completed", "cancelled"),
      defaultValue: "pending",
      allowNull: false,
    },
    cancellationReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isWaiting: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    waitingMinutes: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: true,
    },
    waitingFare: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: true,
    },
    waitingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: "cash",
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.STRING,
      defaultValue: "pending",
      allowNull: true,
    },
    driverEarnings: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: true,
    },
    companyCommission: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: true,
    },
  },
  { sequelize, modelName: "VehicleBooking", tableName: "taxi_vehicle_bookings", timestamps: true, underscored: true }
);
