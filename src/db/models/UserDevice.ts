import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { UserDeviceAttributes, UserDeviceCreationAttributes } from "../types";


export class UserDevice
  extends Model<UserDeviceAttributes, UserDeviceCreationAttributes>
  implements UserDeviceAttributes
{
  declare id: string;
  declare userId: string;
  declare deviceId: string;
  declare name?: string | null;
  
  declare simNumber?: string | null;
  declare deviceType?: string | null;
  declare notificationStatus: string;
  // ------------------------------------

  declare metadata?: Record<string, any> | null;
  declare createdAt?: Date;
  declare updatedAt?: Date;
}



UserDevice.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    deviceId: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    simNumber: { type: DataTypes.STRING(20), allowNull: true },
    deviceType: { type: DataTypes.STRING(20), allowNull: true, defaultValue: "Car" },
    notificationStatus: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'unread' }, // මේක මෙතනට දාන්න
    metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
  },
  {
    sequelize,
    modelName: "UserDevice",
    tableName: "user_devices",
    timestamps: true,
    underscored: true,
  }
);
