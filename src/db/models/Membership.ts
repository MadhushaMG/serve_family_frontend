import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { MembershipAttributes, MembershipCreationAttributes } from "../types";
import { User } from "./User";
import { Relationship } from "./Relationship";

export class Membership
  extends Model<MembershipAttributes, MembershipCreationAttributes>
  implements MembershipAttributes
{
  declare id: string;
  declare userId: string;
  declare circleId: string;
  declare role: "admin" | "member";
  declare status: "pending" | "accepted" | "rejected";
  declare nickname?: string | null;
  declare relationshipId?: string | null;
  declare code?: string | null;
  declare codeExpiresAt?: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare User?: User;
  declare relationInfo?: Relationship;
}

Membership.init(
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
    role: {
      type: DataTypes.ENUM("admin", "member"),
      allowNull: false,
      defaultValue: "member",
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    nickname: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: null,
    },
    relationshipId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'relationships',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    codeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "Membership",
    tableName: "memberships",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ["user_id", "circle_id"] },
      { fields: ["circle_id"] },
      { fields: ["status"] },
      { unique: true, fields: ["code"] },
    ],
  }
);
