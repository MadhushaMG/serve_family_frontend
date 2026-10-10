import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { ApiLogAttributes, ApiLogCreationAttributes } from "../types";

export class Log extends Model<ApiLogAttributes, ApiLogCreationAttributes> implements ApiLogAttributes {
  declare id: string;
  declare method: string;
  declare path: string;
  declare action?: string | null;
  declare userId?: string | null;
  declare ipAddress?: string | null;
  declare userAgent?: string | null;
  declare requestBody?: Record<string, any> | null;
  declare statusCode?: number | null;
  declare responseTime?: number | null;
  declare error?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

Log.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    ipAddress: {
      type: DataTypes.STRING(45), // IPv6 max length
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestBody: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseTime: {
      type: DataTypes.INTEGER, // milliseconds
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "Log",
    tableName: "api_logs",
    timestamps: true,
    updatedAt: false, // Only track creation time for logs
    underscored: true,
    indexes: [
      { fields: ["created_at"] },
      { fields: ["method"] },
      { fields: ["user_id"] },
      { fields: ["status_code"] },
    ],
  }
);
