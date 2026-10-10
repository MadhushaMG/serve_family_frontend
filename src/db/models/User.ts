import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize";

export interface UserAttributes {
  id: string;
  name: string;
  email?: string | null;
  password?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  avatar?: string | null;
  metadata?: Record<string, any> | null;
  isTracker: boolean;
  trackerDeviceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  referralCode?: string | null;
  referredById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, "id" | "isTracker" | "createdAt" | "updatedAt"> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare name: string;
  declare email?: string | null;
  declare password?: string | null;
  declare emailVerified?: boolean;
  declare phoneNumber?: string | null;
  declare phoneVerified?: boolean;
  declare avatar?: string | null;
  declare metadata?: Record<string, any> | null;
  declare isTracker: boolean;
  declare trackerDeviceId?: string | null;
  declare latitude?: number | null;
  declare longitude?: number | null;
  declare referralCode?: string | null;
  declare referredById?: string | null;
  declare createdAt?: Date;
  declare updatedAt?: Date;
  declare deletedAt?: Date | null;

  declare getCircles?: () => Promise<any>;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: true, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: true },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    phoneNumber: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    phoneVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    avatar: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
    isTracker: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    trackerDeviceId: { type: DataTypes.STRING, allowNull: true, unique: true },
    latitude: { type: DataTypes.DOUBLE, allowNull: true },
    longitude: { type: DataTypes.DOUBLE, allowNull: true },
    referralCode: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    referredById: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
