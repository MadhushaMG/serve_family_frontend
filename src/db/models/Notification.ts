import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize";
import {
  NotificationAttributes,
  NotificationCreationAttributes,
  NotificationType,
} from "../types";

export class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  declare id: string;
  declare recipientId: string;
  declare actorId: string | null;
  declare circleId: string | null;
  declare locationId: string | null;
  declare type: NotificationType;
  declare message: string;
  declare read: boolean;
  declare metadata: Record<string, any> | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const notificationTypes = [
  "location_reached", "location_left", "invite", "membership_accepted", 
  "membership_rejected", "member_removed", "role_updated", "nickname_updated",
  "location_added", "location_removed", "location_assigned", "location_unassigned",
  "crash_detected", "sos_alert", "low_battery"
];

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    circleId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM(...notificationTypes),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "notifications",
    timestamps: true,
  }
);
