import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { PhoneVerificationAttributes, PhoneVerificationCreationAttributes } from "../types";

export class PhoneVerification
  extends Model<PhoneVerificationAttributes, PhoneVerificationCreationAttributes>
  implements PhoneVerificationAttributes
{
  declare id: string;
  declare phoneNumber: string;
  declare code: string;
  declare expiresAt: Date;
  declare verified?: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

PhoneVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "PhoneVerification",
    tableName: "phone_verifications",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["phone_number"] },
      { fields: ["code"] },
      { fields: ["expires_at"] },
    ],
  }
);

