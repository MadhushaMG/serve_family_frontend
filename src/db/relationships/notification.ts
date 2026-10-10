export function initNotificationRelationships(models: Record<string, any>) {
  const { Notification, User, Circle, Location } = models;
  if (!Notification) return;

  if (User) {
    Notification.belongsTo(User, { as: "recipient", foreignKey: "recipient_id" });
    Notification.belongsTo(User, { as: "actor", foreignKey: "actor_id" });
  }

  if (Circle) Notification.belongsTo(Circle, { foreignKey: "circle_id" });
  if (Location) Notification.belongsTo(Location, { foreignKey: "location_id" });
}
