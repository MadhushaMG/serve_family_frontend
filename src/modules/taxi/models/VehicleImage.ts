import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface VehicleImageAttributes {
  id: string;
  vehicleId: string;
  imageFrontUrl: string;
  imageBackUrl: string;
  imageInUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VehicleImageCreationAttributes extends Optional<VehicleImageAttributes, "id" | "createdAt" | "updatedAt"> {}

export class VehicleImage extends Model<VehicleImageAttributes, VehicleImageCreationAttributes> implements VehicleImageAttributes {
  declare id: string;
  declare vehicleId: string;
  declare imageFrontUrl: string;
  declare imageBackUrl: string;
  declare imageInUrl: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

VehicleImage.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    vehicleId: { type: DataTypes.UUID, allowNull: false },
    imageFrontUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    imageBackUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    imageInUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
  },
  { sequelize, modelName: "VehicleImage", tableName: "taxi_vehicle_images", timestamps: true, underscored: true }
);
