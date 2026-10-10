import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { BatteryLevelAttributes, BatteryLevelCreationAttributes } from "../types";

export class BatteryLevel
  extends Model<BatteryLevelAttributes, BatteryLevelCreationAttributes>
  implements BatteryLevelAttributes
{
  declare id: string;
  declare userId: string;
  declare batteryLevel: number;
  declare deviceId?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

BatteryLevel.init(
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
    batteryLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
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
    modelName: "BatteryLevel",
    tableName: "battery_levels",
    timestamps: true,
    updatedAt: false, // Only track creation time
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["user_id", "created_at"] },
      { fields: ["user_id"] },
      { fields: ["created_at"] },
      { fields: ["device_id"] },
    ],
  }
);

