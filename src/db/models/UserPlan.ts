import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import { UserPlanAttributes, UserPlanCreationAttributes } from "../types";
import { Plan } from "./Plan";

export class UserPlan extends Model<UserPlanAttributes, UserPlanCreationAttributes> implements UserPlanAttributes {
  declare id: string;
  declare userId: string;
  declare planId: string;
  declare status: string; 
  declare createdAt: Date;
  declare updatedAt: Date;

  declare getUser?: () => Promise<any>;
  declare getPlan?: () => Promise<any>;
  declare Plan?: Plan;
}

UserPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "plans", key: "id" },
      onDelete: "RESTRICT",
    },
    status: { 
      type: DataTypes.STRING(20), 
      allowNull: false, 
      defaultValue: "active" 
    },
  },
  {
    sequelize,
    modelName: "UserPlan",
    tableName: "user_plans",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id"],
      },
    ],
  }
);
