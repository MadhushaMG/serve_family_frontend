import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize";

export interface CirclePrivacyAttributes {
  id: string;
  userId: string;
  circleId: string;
  shareLocation: boolean;
  shareBattery: boolean;
  shareAvatar: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CirclePrivacyCreationAttributes extends Optional<CirclePrivacyAttributes, "id" | "shareLocation" | "shareBattery" | "shareAvatar"> {}

export class CirclePrivacy extends Model<CirclePrivacyAttributes, CirclePrivacyCreationAttributes> implements CirclePrivacyAttributes {
  declare id: string;
  declare userId: string;
  declare circleId: string;
  declare shareLocation: boolean;
  declare shareBattery: boolean;
  declare shareAvatar: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

CirclePrivacy.init(
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
      allowNull: false,
    },
    shareLocation: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    shareBattery: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    shareAvatar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "CirclePrivacy",
    tableName: "circle_privacy_settings",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'circle_id'] 
      }
    ]
  }
);
