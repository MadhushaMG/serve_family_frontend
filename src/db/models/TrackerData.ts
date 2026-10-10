import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { TrackerDataAttributes, TrackerDataCreationAttributes } from "../types";

export class TrackerData
  extends Model<TrackerDataAttributes, TrackerDataCreationAttributes>
  implements TrackerDataAttributes
{
  declare id: string;
  declare deviceId: string;
  declare msgType?: string | null;
  declare gpsStatus?: string | null;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare speed?: number | null;
  declare course?: number | null;
  declare statusHex?: string | null;
  declare rawData?: string | null;

  declare accStatus?: string | null;
  declare powerStatus?: string | null;
  declare gsmSignal?: number | null;
  declare batteryVoltage?: string | null;
  declare satellites?: number | null;
  // ----------------------------

  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

TrackerData.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    msgType: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    gpsStatus: {
      type: DataTypes.STRING(1),
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
    speed: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    course: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },
    // --- New Columns for Company Requirements ---
    accStatus: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    powerStatus: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    gsmSignal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    batteryVoltage: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    satellites: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // ------------------------------------------
    statusHex: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    rawData: {
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
    modelName: "TrackerData",
    tableName: "tracker_data",
    timestamps: true,
    updatedAt: false,
    paranoid: false,
    underscored: true,
    indexes: [
      {
        fields: ["device_id", "created_at"],
      },
      {
        fields: ["device_id"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
);
