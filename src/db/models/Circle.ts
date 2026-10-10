import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { CircleAttributes, CircleCreationAttributes } from "../types";
import type { User } from "./User";

export class Circle
  extends Model<CircleAttributes, CircleCreationAttributes>
  implements CircleAttributes
{
  declare id: string;
  declare creatorId: string;
  declare name: string;
  declare metadata?: Record<string, any> | null;
  declare invitationCode?: string | null;
  declare invitationCodeExpiresAt?: Date | null;
  declare notificationSettings?: import("../types").NotificationSettings | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations populated via Sequelize includes
  declare creator?: User;
  declare Users?: User[];
}

Circle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    invitationCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    invitationCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    notificationSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "Circle",
    tableName: "circles",
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [{ unique: true, fields: ["invitation_code"] }],
  }
);
