import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";

export class QrProfile extends Model {
  public id!: string;
  public userId!: string;
  public uniqueCode!: string;
  public displayName!: string;
  public phoneNumber!: string;
  public otherDetails!: string;
  public isActive!: boolean;
  public showDetails!: boolean;
}

QrProfile.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  uniqueCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  displayName: { type: DataTypes.STRING },
  phoneNumber: { type: DataTypes.STRING },
  otherDetails: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  showDetails: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { 
  sequelize, 
  tableName: 'qr_profiles', 
  underscored: true 
});
