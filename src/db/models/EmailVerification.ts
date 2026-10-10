import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { EmailVerificationAttributes, EmailVerificationCreationAttributes } from "../types";

export class EmailVerification
  extends Model<EmailVerificationAttributes, EmailVerificationCreationAttributes>
  implements EmailVerificationAttributes
{
  declare id: string;
  declare email: string;
  declare code: string;
  declare expiresAt: Date;
  declare verified?: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

EmailVerification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      validate: {
        isEmail: true,
      },
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
    modelName: "EmailVerification",
    tableName: "email_verifications",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["email"] },
      { fields: ["code"] },
      { fields: ["expires_at"] },
    ],
  }
);

