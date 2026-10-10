import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { OAuthAccountAttributes, OAuthAccountCreationAttributes } from "../types";

export class OAuthAccount
  extends Model<OAuthAccountAttributes, OAuthAccountCreationAttributes>
  implements OAuthAccountAttributes
{
  declare id: string;
  declare userId: string;
  declare provider: string;
  declare providerId: string;
  declare accessToken?: string | null;
  declare refreshToken?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

OAuthAccount.init(
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
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    providerId: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshToken: {
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
    modelName: "OAuthAccount",
    tableName: "oauth_accounts",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [{ unique: true, fields: ["provider", "provider_id"] }, { fields: ["user_id"] }],
  }
);
