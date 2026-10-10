import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { UserLocationAttributes, UserLocationCreationAttributes } from "../types";

export class UserLocation
  extends Model<UserLocationAttributes, UserLocationCreationAttributes>
  implements UserLocationAttributes
{
  declare id: string;
  declare userId: string;
  declare circleId?: string | null;
  declare locationId?: string | null;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
}

UserLocation.init(
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
    circleId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    locationId: {
      type: DataTypes.UUID,
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
    modelName: "UserLocation",
    tableName: "user_locations",
    timestamps: true,
    updatedAt: false,
    paranoid: false,
    underscored: true,
  }
);
