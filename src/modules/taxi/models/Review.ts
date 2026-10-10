import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface ReviewAttributes {
  id: string;
  bookingId: string;
  userId: string;       
  vehicleId: string;   
  rating: number;       // 1-5 
  feedback: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewCreationAttributes extends Optional<ReviewAttributes, "id" | "feedback" | "createdAt" | "updatedAt"> {}

export class Review extends Model<ReviewAttributes, ReviewCreationAttributes> implements ReviewAttributes {
  declare id: string;
  declare bookingId: string;
  declare userId: string;
  declare vehicleId: string;
  declare rating: number;
  declare feedback: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Review.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    bookingId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    vehicleId: { type: DataTypes.UUID, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    feedback: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: "Review", tableName: "taxi_reviews", timestamps: true, underscored: true }
);
