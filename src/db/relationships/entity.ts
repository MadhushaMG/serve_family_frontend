export function initEntityRelationships(models: Record<string, any>) {
  const { Entity, Circle, User, CircleEntity } = models;
  if (!Entity) return;

  if (User) {
    Entity.belongsTo(User, { as: "Owner", foreignKey: "owner_id" });
    User.hasMany(Entity, { foreignKey: "owner_id" });
  }

  // Many-to-many relationship with Circle through CircleEntity
  if (Circle && CircleEntity) {
    Entity.belongsToMany(Circle, {
      through: CircleEntity,
      foreignKey: "entity_id",
      otherKey: "circle_id",
    });
  }

  if (CircleEntity) {
    CircleEntity.belongsTo(Entity, { foreignKey: "entity_id" });
    if (Circle) {
      CircleEntity.belongsTo(Circle, { foreignKey: "circle_id" });
    }
  }
}

