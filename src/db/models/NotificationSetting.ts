import { DataTypes, Model, Sequelize } from "sequelize";

export class NotificationSetting extends Model {
  public id!: string;
  public circleId!: string;
  public eventType!: string; 
  public audience!: string; 

  public static initModel(sequelize: Sequelize) {
    NotificationSetting.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        circleId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        eventType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        audience: {
          type: DataTypes.ENUM("ALL", "ADMINS", "USER", "OTHERS", "NONE"),
          defaultValue: "ALL",
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: "notification_settings",
        timestamps: true, 
      }
    );
  }
}
