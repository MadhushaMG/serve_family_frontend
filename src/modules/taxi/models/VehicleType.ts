import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface VehicleTypeAttributes {
  id: string;
  type: string;          // e.g., Tuk, Mini, Car, Van
  category: "hire" | "transport";
  baseFare: number;      
  ratePerKm: number;     
  seats: number;       
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleTypeCreationAttributes extends Optional<VehicleTypeAttributes, "id" | "category" | "createdAt" | "updatedAt"> {}

export class VehicleType extends Model<VehicleTypeAttributes, VehicleTypeCreationAttributes> implements VehicleTypeAttributes {
  declare id: string;
  declare type: string;
  declare category: "hire" | "transport";
  declare baseFare: number;
  declare ratePerKm: number;
  declare seats: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

VehicleType.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    category: {
      type: DataTypes.ENUM("hire", "transport"),
      allowNull: false,
      defaultValue: "hire",
    },
    baseFare: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    ratePerKm: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.0,
    },
    seats: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    modelName: "VehicleType",
    tableName: "taxi_vehicle_types",
    timestamps: true,
    underscored: true,
  }
);
