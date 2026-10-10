import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { FirebaseTokenAttributes, FirebaseTokenCreationAttributes } from "../types";

export class FirebaseToken
  extends Model<FirebaseTokenAttributes, FirebaseTokenCreationAttributes>
  implements FirebaseTokenAttributes
{
  declare id: string;
  declare userId: string;
  declare token: string;
  declare deviceId?: string | null;
  declare deviceType?: string | null;
  declare userAgent?: string | null;
  declare deviceDetails?: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

FirebaseToken.init(
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
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    deviceId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviceDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "FirebaseToken",
    tableName: "firebase_tokens",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["token"] },
      { unique: true, fields: ["user_id", "device_id"] }, // One token per user per device
    ],
  }
);

