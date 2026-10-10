export function initMembershipRelationships(models: Record<string, any>) {
  const { Membership, User, Circle } = models;
  if (!Membership) return;

  if (User) Membership.belongsTo(User, { foreignKey: "user_id" });
  if (Circle) Membership.belongsTo(Circle, { foreignKey: "circle_id" });

  // indices and many-to-many setup are handled where both sides exist
}
