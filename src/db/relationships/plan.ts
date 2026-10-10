export function initPlanRelationships(models: Record<string, any>) {
  const { Plan, UserPlan, User } = models;

  if (!Plan) return;

  if (UserPlan) {
    UserPlan.belongsTo(Plan, { foreignKey: "plan_id" });
    Plan.hasMany(UserPlan, { foreignKey: "plan_id" });
  }

  if (User && UserPlan) {
    UserPlan.belongsTo(User, { foreignKey: "user_id" });
    User.hasOne(UserPlan, { foreignKey: "user_id" });
  }
}

