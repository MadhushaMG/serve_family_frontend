import { sequelize } from "../sequelize";
import { User } from "./User";
import { RefreshToken } from "./RefreshToken";
import { PasswordReset } from "./PasswordReset";
import { EmailVerification } from "./EmailVerification";
import { PhoneVerification } from "./PhoneVerification";
import { OAuthAccount } from "./OAuthAccount";
import { Circle } from "./Circle";
import { Membership } from "./Membership";
import { Location } from "./Location";
import { LocationHistory } from "./LocationHistory";
import { BatteryLevel } from "./BatteryLevel";
import { CrashDetection } from "./CrashDetection";
import { SOSAlert } from "./SOSAlert";
import { Notification } from "./Notification";
import { Log } from "./Log";
import { Plan } from "./Plan";
import { UserPlan } from "./UserPlan";
import { UserDevice } from "./UserDevice";
import { TrackerData } from "./TrackerData";
import { Entity } from "./Entity";
import { CircleEntity } from "./CircleEntity";
import { UserLocation } from "./UserLocation";
import { FirebaseToken } from "./FirebaseToken";
import { NotificationSetting } from "./NotificationSetting";
import { Referral } from "./Referral";

import { initUserRelationships } from "../relationships/user";
import { initCircleRelationships } from "../relationships/circle";
import { initMembershipRelationships } from "../relationships/membership";
import { initLocationRelationships } from "../relationships/location";
import { initNotificationRelationships } from "../relationships/notification";
import { initLogRelationships } from "../relationships/log";
import { initPlanRelationships } from "../relationships/plan";
import { initEntityRelationships } from "../relationships/entity";

const models = {
  User, RefreshToken, PasswordReset, EmailVerification, PhoneVerification,
  OAuthAccount, Circle, Membership, Location, LocationHistory, BatteryLevel,
  CrashDetection, SOSAlert, Notification, Log, Plan, UserPlan, UserDevice,
  TrackerData, Entity, CircleEntity, UserLocation, FirebaseToken, NotificationSetting, Referral
};

Object.values(models).forEach((model: any) => {
  if (model.initModel) {
    model.initModel(sequelize);
  }
});

initUserRelationships(models);
initCircleRelationships(models);
initMembershipRelationships(models);
initLocationRelationships(models);
initNotificationRelationships(models);
initLogRelationships(models);
initPlanRelationships(models);
initEntityRelationships(models);

User.hasMany(Referral, { foreignKey: "referrerId", as: "myReferrals" });
Referral.belongsTo(User, { foreignKey: "referrerId", as: "referrerInfo" });
Referral.belongsTo(User, { foreignKey: "referredUserId", as: "joinedUser" });

export { sequelize };
export {
  User, RefreshToken, PasswordReset, EmailVerification, PhoneVerification,
  OAuthAccount, Circle, Membership, Location, LocationHistory, BatteryLevel,
  CrashDetection, SOSAlert, Notification, Log, Plan, UserPlan, UserDevice,
  TrackerData, Entity, CircleEntity, UserLocation, FirebaseToken, NotificationSetting, Referral
};
export default models;
