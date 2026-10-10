import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize";

interface LocationAttributes {
  id: string;
  circleId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LocationCreationAttributes
  extends Optional<LocationAttributes, "id" | "metadata" | "radius"> {}

export class Location
  extends Model<LocationAttributes, LocationCreationAttributes>
  implements LocationAttributes
{
  public id!: string;
  public circleId!: string;
  public name!: string;
  public latitude!: number;
  public longitude!: number;
  public radius!: number;
  public metadata!: any;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Location.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    circleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "circle_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },
    radius: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "Locations",
    underscored: true,
    timestamps: true,
  }
);
