import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { SOSAlertAttributes, SOSAlertCreationAttributes } from "../types";

export class SOSAlert
  extends Model<SOSAlertAttributes, SOSAlertCreationAttributes>
  implements SOSAlertAttributes
{
  declare id: string;
  declare userId: string;
  declare message?: string | null;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

SOSAlert.init(
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
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DOUBLE,
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
    modelName: "SOSAlert",
    tableName: "sos_alerts",
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

