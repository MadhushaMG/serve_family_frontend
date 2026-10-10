export function initUserRelationships(models: Record<string, any>) {
  const { User, OAuthAccount, Membership, Circle, UserLocation, LocationHistory, FirebaseToken, CrashDetection, SOSAlert, BatteryLevel, UserDevice } = models;

  if (!User) return;

  if (OAuthAccount) {
    OAuthAccount.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(OAuthAccount, { foreignKey: "user_id" });
  }

  if (Membership) {
    // user side of membership
    Membership.belongsTo(User, { foreignKey: "user_id" });

    User.hasMany(Membership, { foreignKey: "user_id" });

    User.belongsToMany(Circle, {
      through: Membership,
      foreignKey: "user_id",
      otherKey: "circle_id",
    });
  }

  if (UserLocation) {
    UserLocation.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(UserLocation, { foreignKey: "user_id" });
  }

  if (LocationHistory) {
    LocationHistory.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(LocationHistory, { foreignKey: "user_id" });
  }

  if (FirebaseToken) {
    FirebaseToken.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(FirebaseToken, { foreignKey: "user_id" });
  }

  if (CrashDetection) {
    CrashDetection.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(CrashDetection, { foreignKey: "user_id" });
  }

  if (SOSAlert) {
    SOSAlert.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(SOSAlert, { foreignKey: "user_id" });
  }

  if (BatteryLevel) {
    BatteryLevel.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(BatteryLevel, { foreignKey: "user_id" });
  }

  if (UserDevice) {
    UserDevice.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(UserDevice, { foreignKey: "user_id" });
  }
}
