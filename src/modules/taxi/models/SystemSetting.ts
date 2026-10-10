import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface SystemSettingAttributes {
  id: string;
  key: string;
  value: any;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SystemSettingCreationAttributes extends Optional<SystemSettingAttributes, "id" | "createdAt" | "updatedAt"> {}

export class SystemSetting extends Model<SystemSettingAttributes, SystemSettingCreationAttributes> implements SystemSettingAttributes {
  declare id: string;
  declare key: string;
  declare value: any;
  declare description?: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

SystemSetting.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    key: { type: DataTypes.STRING, allowNull: false, unique: true },
    value: { type: DataTypes.JSONB, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "SystemSetting", tableName: "system_settings", timestamps: true, underscored: true }
);
