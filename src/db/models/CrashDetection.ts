import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { CrashDetectionAttributes, CrashDetectionCreationAttributes } from "../types";

export class CrashDetection
  extends Model<CrashDetectionAttributes, CrashDetectionCreationAttributes>
  implements CrashDetectionAttributes
{
  declare id: string;
  declare userId: string;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare crashDetails?: string | null;
  declare deviceId?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

CrashDetection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    crashDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviceId: {
      type: DataTypes.STRING(255),
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
    modelName: "CrashDetection",
    tableName: "crash_detections",
    timestamps: true,
    updatedAt: false, // Only track creation time
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["user_id"] },
      { fields: ["created_at"] },
    ],
  }
);

