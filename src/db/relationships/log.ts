export function initLogRelationships(models: Record<string, any>) {
  const { Log, User } = models;
  if (!Log) return;

  if (User) {
    Log.belongsTo(User, { foreignKey: "user_id" });
    User.hasMany(Log, { foreignKey: "user_id" });
  }
}

