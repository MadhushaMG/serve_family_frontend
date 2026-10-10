import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export class Referral extends Model {
  declare id: string;
  declare referrerId: string;
  declare referralCode: string;
  declare referredUserId: string | null;
  declare status: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare referrerInfo?: any;
}

Referral.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    referrerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referralCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    referredUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    sequelize,
    modelName: "Referral",
    tableName: "referrals",
    underscored: true,
    timestamps: true,
  }
);
