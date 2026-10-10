import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface DriverDocumentAttributes {
  id: string;
  userId: string;
  documentType: string; // "NIC" or "DrivingLicense"
  documentNumber?: string | null;
  frontUrl: string;
  backUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DriverDocumentCreationAttributes extends Optional<DriverDocumentAttributes, "id" | "createdAt" | "updatedAt"> {}

export class DriverDocument extends Model<DriverDocumentAttributes, DriverDocumentCreationAttributes> implements DriverDocumentAttributes {
  declare id: string;
  declare userId: string;
  declare documentType: string;
  declare documentNumber?: string | null;
  declare frontUrl: string;
  declare backUrl: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

DriverDocument.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    documentType: { type: DataTypes.STRING, allowNull: false, defaultValue: "NIC" },
    documentNumber: { type: DataTypes.STRING, allowNull: true },
    frontUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
    backUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: "" },
  },
  { sequelize, modelName: "DriverDocument", tableName: "taxi_driver_documents", timestamps: true, underscored: true }
);
