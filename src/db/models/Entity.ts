import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { EntityAttributes, EntityCreationAttributes } from "../types";
import type { Circle } from "./Circle";
import type { User } from "./User";

export class Entity
  extends Model<EntityAttributes, EntityCreationAttributes>
  implements EntityAttributes
{
  declare id: string;
  declare name: string;
  declare type: string; // 'pet', 'car', etc.
  declare deviceId?: string | null;
  declare ownerId?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt?: Date | null;

  // Associations
  declare Circles?: Circle[];
  declare Owner?: User;
}

Entity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'device_id'
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
      field: 'owner_id'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "Entity",
    tableName: "entities",
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      { fields: ["type"] },
      { fields: ["owner_id"] },
      { fields: ["device_id"] },
    ],
  }
);
