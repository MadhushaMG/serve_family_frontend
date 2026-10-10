import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface AgentAttributes {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  locationName: string;
  province?: string | null;
  district?: string | null;
  dsds?: string | null;
  coverageArea?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentCreationAttributes
  extends Optional<
    AgentAttributes,
    "id" | "phone" | "province" | "district" | "dsds" | "coverageArea" | "latitude" | "longitude" | "status" | "createdAt" | "updatedAt"
  > {}

export class Agent extends Model<AgentAttributes, AgentCreationAttributes> implements AgentAttributes {
  declare id: string;
  declare name: string;
  declare email: string;
  declare phone: string;
  declare locationName: string;
  declare province?: string | null;
  declare district?: string | null;
  declare dsds?: string | null;
  declare coverageArea?: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare status: "active" | "inactive";
  declare createdAt: Date;
  declare updatedAt: Date;
}

Agent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    locationName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dsds: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverageArea: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Agent",
    tableName: "taxi_agents",
    timestamps: true,
    underscored: true,
  }
);
