export function initLocationRelationships(models: Record<string, any>) {
  const { Location, Circle, UserLocation } = models;
  if (!Location) return;

  if (Circle) {
    Location.belongsTo(Circle, { foreignKey: "circle_id" });
    if (UserLocation) {
      UserLocation.belongsTo(Circle, { foreignKey: "circle_id" });
    }
  }
  if (UserLocation) {
    Location.hasMany(UserLocation, { foreignKey: "location_id" });
    UserLocation.belongsTo(Location, { foreignKey: "location_id" });
  }
}
