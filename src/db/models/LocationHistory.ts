import { DataTypes, Model, Sequelize } from "sequelize"; 
import { LocationHistoryAttributes, LocationHistoryCreationAttributes } from "../types";

export class LocationHistory
  extends Model<LocationHistoryAttributes, LocationHistoryCreationAttributes>
  implements LocationHistoryAttributes
{
  declare id: string;
  declare userId: string;
  declare latitude: number;
  declare longitude: number;
  declare name?: string | null;
  declare circleId?: string | null;
  declare metadata?: Record<string, any> | null;
  declare createdAt: Date;


  static initModel(sequelize: Sequelize) {
    return LocationHistory.init(
      {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        userId: { type: DataTypes.UUID, allowNull: false },
        latitude: { type: DataTypes.DOUBLE, allowNull: false },
        longitude: { type: DataTypes.DOUBLE, allowNull: false },
        name: { type: DataTypes.STRING(255), allowNull: true },
        circleId: { type: DataTypes.UUID, allowNull: true },
        metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
      },
      {
        sequelize,
        modelName: "LocationHistory",
        tableName: "location_history",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [{ fields: ["user_id", "created_at"] }, { fields: ["user_id"] }],
      }
    );
  }
}
