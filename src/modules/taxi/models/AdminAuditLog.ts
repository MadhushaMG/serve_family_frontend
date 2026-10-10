import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../../../db/sequelize";

export interface AdminAuditLogAttributes {
  id: string;
  adminId?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
  action: string;
  targetEntity?: string | null;
  targetId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AdminAuditLogCreationAttributes extends Optional<AdminAuditLogAttributes, "id" | "createdAt" | "updatedAt"> {}

export class AdminAuditLog extends Model<AdminAuditLogAttributes, AdminAuditLogCreationAttributes> implements AdminAuditLogAttributes {
  declare id: string;
  declare adminId?: string | null;
  declare adminName?: string | null;
  declare adminEmail?: string | null;
  declare action: string;
  declare targetEntity?: string | null;
  declare targetId?: string | null;
  declare details?: Record<string, any> | null;
  declare ipAddress?: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

AdminAuditLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    adminId: { type: DataTypes.UUID, allowNull: true },
    adminName: { type: DataTypes.STRING, allowNull: true },
    adminEmail: { type: DataTypes.STRING, allowNull: true },
    action: { type: DataTypes.STRING, allowNull: false },
    targetEntity: { type: DataTypes.STRING, allowNull: true },
    targetId: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSONB, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
  },
  { sequelize, modelName: "AdminAuditLog", tableName: "admin_audit_logs", timestamps: true, underscored: true }
);
