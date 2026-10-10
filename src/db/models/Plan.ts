import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { PlanAttributes, PlanCreationAttributes } from "../types";

export class Plan extends Model<PlanAttributes, PlanCreationAttributes> implements PlanAttributes {
  declare id: string;
  declare name: string;
  declare maxGroups: number;    
  declare maxTracking: number;  
  declare maxDevices: number;   
  declare hasSms: boolean;      
  declare hasPhoneAlert: boolean;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  declare getUsers?: () => Promise<any>;
}

Plan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        isIn: [["Free", "Silver", "Gold", "Platinum"]],
      },
    },
    maxGroups: { type: DataTypes.INTEGER, defaultValue: 1 },
    maxTracking: { type: DataTypes.INTEGER, defaultValue: 1 },
    maxDevices: { type: DataTypes.INTEGER, defaultValue: 1 },
    hasSms: { type: DataTypes.BOOLEAN, defaultValue: false },
    hasPhoneAlert: { type: DataTypes.BOOLEAN, defaultValue: false },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: "Plan",
    tableName: "plans",
    timestamps: true,
    underscored: true,
  }
);
