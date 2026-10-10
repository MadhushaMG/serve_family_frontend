import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { RelationshipAttributes, RelationshipCreationAttributes } from "../types";

export class Relationship
  extends Model<RelationshipAttributes, RelationshipCreationAttributes>
  implements RelationshipAttributes
{
  declare id: string;
  declare name: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Relationship.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "Relationship",
    tableName: "relationships",
    timestamps: true,
    underscored: true,
  }
);
