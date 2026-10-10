import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { CircleEntityAttributes, CircleEntityCreationAttributes } from "../types";
import type { Circle } from "./Circle";
import type { Entity } from "./Entity";

export class CircleEntity
  extends Model<CircleEntityAttributes, CircleEntityCreationAttributes>
  implements CircleEntityAttributes
{
  declare id: string;
  declare entityId: string;
  declare circleId: string;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations populated via Sequelize includes
  declare Entity?: Entity;
  declare Circle?: Circle;
}

CircleEntity.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    circleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "CircleEntity",
    tableName: "circle_entities",
    timestamps: true,
    paranoid: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ["entity_id", "circle_id"] },
      { fields: ["circle_id"] },
      { fields: ["entity_id"] },
    ],
  }
);

