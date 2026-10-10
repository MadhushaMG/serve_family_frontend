import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { PasswordResetAttributes, PasswordResetCreationAttributes } from "../types";

export class PasswordReset
  extends Model<PasswordResetAttributes, PasswordResetCreationAttributes>
  implements PasswordResetAttributes
{
  declare id: string;
  declare userId: string;
  declare email?: string | null;
  declare phoneNumber?: string | null;
  declare code: string;
  declare expiresAt: Date;
  declare verified?: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

PasswordReset.init(
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
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
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
    modelName: "PasswordReset",
    tableName: "password_resets",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["email"] },
      { fields: ["phone_number"] },
      { fields: ["code"] },
      { fields: ["expires_at"] },
      { fields: ["verified"] },
    ],
  }
);

