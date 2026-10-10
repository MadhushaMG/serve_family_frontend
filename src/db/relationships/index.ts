import { initUserRelationships } from "./user";
import { initMembershipRelationships } from "./membership";
import { initCircleRelationships } from "./circle";
import { initLocationRelationships } from "./location";
import { initNotificationRelationships } from "./notification";
import { initLogRelationships } from "./log";
import { initPlanRelationships } from "./plan";
import { initEntityRelationships } from "./entity";

export function initRelationships(models: Record<string, any>) {
  // call domain-specific initializers
  initUserRelationships(models);
  initMembershipRelationships(models);
  initCircleRelationships(models);
  initLocationRelationships(models);
  initNotificationRelationships(models);
  initLogRelationships(models);
  initPlanRelationships(models);
  initEntityRelationships(models);
}
