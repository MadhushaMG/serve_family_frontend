export function initCircleRelationships(models: Record<string, any>) {
  const { Circle, User, Membership, Location, UserLocation, LocationHistory, Entity, NotificationSetting } = models;
  if (!Circle) return;

  if (User) {
    Circle.belongsTo(User, { as: "creator", foreignKey: "creator_id" });
    User.hasMany(Circle, { foreignKey: "creator_id" });
  }

  if (Membership) Circle.hasMany(Membership, { foreignKey: "circle_id" });
  if (Location) Circle.hasMany(Location, { foreignKey: "circle_id" });
  if (UserLocation) Circle.hasMany(UserLocation, { foreignKey: "circle_id" });
  
  if (LocationHistory) {
    Circle.hasMany(LocationHistory, { foreignKey: "circle_id" });
    LocationHistory.belongsTo(Circle, { foreignKey: "circle_id" });
  }

  if (Entity && models.CircleEntity) {
    Circle.belongsToMany(Entity, {
      through: models.CircleEntity,
      foreignKey: "circle_id",
      otherKey: "entity_id",
    });
  }

  if (Membership && User) {
    Circle.belongsToMany(User, {
      through: Membership,
      foreignKey: "circle_id",
      otherKey: "user_id",
      as: "members",
    });
    Circle.belongsToMany(User, {
      through: Membership,
      foreignKey: "circle_id",
      otherKey: "user_id",
      as: "Users",
    });
  }

if (NotificationSetting) {
    Circle.hasMany(NotificationSetting, { foreignKey: "circleId", as: "settings" });
    NotificationSetting.belongsTo(Circle, { foreignKey: "circleId", as: "circle" });
  }


}
