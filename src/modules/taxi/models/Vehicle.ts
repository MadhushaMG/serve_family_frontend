import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface VehicleAttributes {
  id: string;
  userId: string;              
  vehicleTypeId: string;       // Tuk, Car, Van, etc.
  vehicleRegNum: string;       
  approvalStatus: string;      // pending, approved, rejected, suspended
  mobileNum: string;           
  showMobileNum: boolean;      // Toggle whether phone number is publicly shown before booking acceptance
  trackerUid: string | null;   // SinoTrack Device ID
  color: string;
  isActive: boolean;           // Driver Online (true) / Offline (false)
  ratePerKm?: number | null;   // Hire rate per KM
  baseFare?: number | null;     // Base hire fare
  pickupFare?: number | null;   // Separate Pickup Price (Pickup Fee)
  waitingFare?: number | null;  // Waiting charge (e.g. LKR per minute)
  isWaiting?: boolean;          // Waiting mode active / toggled
  waitingStartedAt?: Date | null; // Timestamp when current waiting session started
  latitude?: number | null;    // Current live latitude
  longitude?: number | null;   // Current live longitude
  baseLatitude?: number | null; // Mother Location Latitude (Home/Stand Base)
  baseLongitude?: number | null;// Mother Location Longitude
  baseAddress?: string | null;  // Mother Location Address
  agentId?: string | null;      // Assigned Agent ID
  approvedBy?: string | null;   // Name/Role of approver (e.g. "Kandy Regional Agent")
  approvedById?: string | null; // User/Agent ID of approver
  approvedAt?: Date | null;     // Timestamp of approval/rejection
  approvalReason?: string | null;// Approval/rejection note or reason
  driver?: any;                 // Sequelize User association (driver)
  vehicleType?: any;            // Sequelize VehicleType association
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleCreationAttributes extends Optional<
  VehicleAttributes, 
  "id" | "trackerUid" | "approvalStatus" | "isActive" | "showMobileNum" | "createdAt" | "updatedAt" | "baseLatitude" | "baseLongitude" | "baseAddress" | "baseFare" | "pickupFare" | "ratePerKm" | "waitingFare" | "isWaiting" | "waitingStartedAt" | "agentId" | "approvedBy" | "approvedById" | "approvedAt" | "approvalReason"
> {}

export class Vehicle extends Model<VehicleAttributes, VehicleCreationAttributes> implements VehicleAttributes {
  declare id: string;
  declare userId: string;
  declare vehicleTypeId: string;
  declare vehicleRegNum: string;
  declare approvalStatus: string;
  declare mobileNum: string;
  declare showMobileNum: boolean;
  declare trackerUid: string | null;
  declare color: string;
  declare isActive: boolean;
  declare ratePerKm: number | null;
  declare baseFare: number | null;
  declare pickupFare: number | null;
  declare waitingFare: number | null;
  declare isWaiting: boolean;
  declare waitingStartedAt: Date | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare baseLatitude: number | null;
  declare baseLongitude: number | null;
  declare baseAddress: string | null;
  declare agentId: string | null;
  declare approvedBy: string | null;
  declare approvedById: string | null;
  declare approvedAt: Date | null;
  declare approvalReason: string | null;
  declare driver: any;
  declare vehicleType: any;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Vehicle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vehicleTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    vehicleRegNum: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    approvalStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "suspended"),
      defaultValue: "pending",
      allowNull: false,
    },
    mobileNum: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    showMobileNum: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    trackerUid: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Default Offline
    },
    ratePerKm: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    baseFare: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    pickupFare: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
    waitingFare: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
    },
    isWaiting: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    waitingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    baseLatitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    baseLongitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    baseAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    agentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approvedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approvedById: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvalReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Vehicle",
    tableName: "taxi_vehicles",
    timestamps: true,
    underscored: true,
  }
);
