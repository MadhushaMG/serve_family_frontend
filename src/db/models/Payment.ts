import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export class Payment extends Model {
  declare id: string;
  declare userId: string;
  declare planId: string;
  declare transactionId: string;
  declare amount: number;
  declare status: string;
  declare rawResponse: any;
}

Payment.init(
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
    planId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
    },
    rawResponse: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments",
    underscored: true,
  }
);
