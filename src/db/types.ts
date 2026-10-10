import { Optional } from "sequelize";
import { markNotificationAsRead } from "../controllers/deviceController";

export interface UserAttributes {
  id: string;
  name: string;
  email?: string | null;
  password?: string | null;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  avatar?: string | null;
  metadata?: Record<string, any> | null;
  notificationStatus?: string | null;
  isTracker?: boolean;
  trackerDeviceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export type UserCreationAttributes = Optional<
  UserAttributes,
  | "id"
  | "email"
  | "password"
  | "emailVerified"
  | "phoneNumber"
  | "phoneVerified"
  | "avatar"
  | "metadata"
  | "isTracker"
  | "trackerDeviceId"
  | "latitude"
  | "longitude"
  | "createdAt"
  | "updatedAt"
>;

export interface OAuthAccountAttributes {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OAuthAccountCreationAttributes = Optional<
  OAuthAccountAttributes,
  "id" | "accessToken" | "refreshToken" | "metadata" | "createdAt" | "updatedAt"
>;

export interface CircleAttributes {
  id: string;
  name: string;
  creatorId: string;
  metadata?: Record<string, any> | null;
  invitationCode?: string | null;
  invitationCodeExpiresAt?: Date | null;
  notificationSettings?: NotificationSettings | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CircleCreationAttributes = Optional<
  CircleAttributes,
  | "id"
  | "metadata"
  | "invitationCode"
  | "invitationCodeExpiresAt"
  | "notificationSettings"
  | "createdAt"
  | "updatedAt"
>;

export interface MembershipAttributes {
  id: string;
  userId: string;
  circleId: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "rejected";
  nickname?: string | null;
  relationshipId?: string | null;
  code?: string | null;
  codeExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MembershipCreationAttributes = Optional<
  MembershipAttributes,
  "id" | "nickname" | "relationshipId" | "code" | "codeExpiresAt" | "createdAt" | "updatedAt"
>;

export interface LocationAttributes {
  id: string;
  circleId?: string | null;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type LocationCreationAttributes = Optional<
  LocationAttributes,
  "id" | "circleId" | "latitude" | "longitude" | "metadata" | "createdAt" | "updatedAt"
>;

export interface UserLocationAttributes {
  id: string;
  userId: string;
  circleId?: string | null;
  locationId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type UserLocationCreationAttributes = Optional<
  UserLocationAttributes,
  "id" | "circleId" | "locationId" | "latitude" | "longitude" | "metadata" | "createdAt"
>;

export interface LocationHistoryAttributes {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  name?: string | null;
  circleId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type LocationHistoryCreationAttributes = Optional<
  LocationHistoryAttributes,
  "id" | "name" | "circleId" | "metadata" | "createdAt"
>;

export enum NotificationType {
  LOCATION_REACHED = "location_reached",
  LOCATION_LEFT = "location_left",
  INVITE = "invite",
  MEMBERSHIP_ACCEPTED = "membership_accepted",
  MEMBERSHIP_REJECTED = "membership_rejected",
  MEMBER_REMOVED = "member_removed",
  ROLE_UPDATED = "role_updated",
  NICKNAME_UPDATED = "nickname_updated",
  LOCATION_ADDED = "location_added",
  LOCATION_REMOVED = "location_removed",
  LOCATION_ASSIGNED = "location_assigned",
  LOCATION_UNASSIGNED = "location_unassigned",
  CRASH_DETECTED = "crash_detected",
  SOS_ALERT = "sos_alert",
  LOW_BATTERY = "low_battery",
}

export enum NotificationRecipientType {
  ALL_MEMBERS = "all_members",
  CREATOR_AND_ADMINS = "creator_and_admins",
  TRIGGERING_USER_ONLY = "triggering_user_only",
  NONE = "none",
}

export type NotificationSettings = Partial<Record<NotificationType, NotificationRecipientType>>;

export interface NotificationAttributes {
  id: string;
  recipientId: string;
  actorId?: string | null;
  circleId?: string | null;
  locationId?: string | null;
  type: NotificationType;
  message: string;
  read?: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type NotificationCreationAttributes = Optional<
  NotificationAttributes,
  "id" | "actorId" | "circleId" | "locationId" | "read" | "metadata" | "createdAt"
>;

export interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revoked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RefreshTokenCreationAttributes = Optional<
  RefreshTokenAttributes,
  "id" | "revoked" | "createdAt" | "updatedAt"
>;

export interface FirebaseTokenAttributes {
  id: string;
  userId: string;
  token: string;
  deviceId?: string | null;
  deviceType?: string | null;
  userAgent?: string | null;
  deviceDetails?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FirebaseTokenCreationAttributes = Optional<
  FirebaseTokenAttributes,
  "id" | "deviceId" | "deviceType" | "userAgent" | "deviceDetails" | "createdAt" | "updatedAt"
>;

export interface ApiLogAttributes {
  id: string;
  method: string;
  path: string;
  action?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestBody?: Record<string, any> | null;
  statusCode?: number | null;
  responseTime?: number | null;
  error?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type ApiLogCreationAttributes = Optional<
  ApiLogAttributes,
  | "id"
  | "action"
  | "userId"
  | "ipAddress"
  | "userAgent"
  | "requestBody"
  | "statusCode"
  | "responseTime"
  | "error"
  | "metadata"
  | "createdAt"
>;

export interface EmailVerificationAttributes {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EmailVerificationCreationAttributes = Optional<
  EmailVerificationAttributes,
  "id" | "verified" | "createdAt" | "updatedAt"
>;

export interface PhoneVerificationAttributes {
  id: string;
  phoneNumber: string;
  code: string;
  expiresAt: Date;
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PhoneVerificationCreationAttributes = Optional<
  PhoneVerificationAttributes,
  "id" | "verified" | "createdAt" | "updatedAt"
>;

export interface PasswordResetAttributes {
  id: string;
  userId: string;
  email?: string | null;
  phoneNumber?: string | null;
  code: string;
  expiresAt: Date;
  verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PasswordResetCreationAttributes = Optional<
  PasswordResetAttributes,
  "id" | "email" | "phoneNumber" | "verified" | "createdAt" | "updatedAt"
>;


export interface PlanAttributes {
  id: string;
  name: string;
  maxGroups: number;   
  maxTracking: number;
  maxDevices: number;
  hasSms: boolean;
  hasPhoneAlert: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PlanCreationAttributes extends Optional<PlanAttributes, "id" | "createdAt" | "updatedAt" | "maxGroups" | "maxTracking" | "maxDevices" | "hasSms" | "hasPhoneAlert"> {}

export interface UserPlanAttributes {
  id: string;
  userId: string;
  status: string;
  planId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserPlanCreationAttributes = Optional<
  UserPlanAttributes,
  "id" | "createdAt" | "updatedAt" | "status"
>;

export interface CrashDetectionAttributes {
  id: string;
  userId: string;
  latitude?: number | null;
  longitude?: number | null;
  crashDetails?: string | null;
  deviceId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type CrashDetectionCreationAttributes = Optional<
  CrashDetectionAttributes,
  "id" | "latitude" | "longitude" | "crashDetails" | "deviceId" | "metadata" | "createdAt"
>;

export interface SOSAlertAttributes {
  id: string;
  userId: string;
  message?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type SOSAlertCreationAttributes = Optional<
  SOSAlertAttributes,
  "id" | "message" | "latitude" | "longitude" | "metadata" | "createdAt"
>;

export interface BatteryLevelAttributes {
  id: string;
  userId: string;
  batteryLevel: number;
  deviceId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type BatteryLevelCreationAttributes = Optional<
  BatteryLevelAttributes,
  "id" | "deviceId" | "metadata" | "createdAt"
>;

export interface TrackerDataAttributes {
  id: string;
  deviceId: string;
  msgType?: string | null;
  gpsStatus?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  speed?: number | null;
  course?: number | null;
  accStatus?: string | null;
  powerStatus?: string | null;
  gsmSignal?: number | null;
  batteryVoltage?: string | null;
  satellites?: number | null;
  statusHex?: string | null;
  rawData?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export type TrackerDataCreationAttributes = Optional<
  TrackerDataAttributes,
  | "id"
  | "msgType"
  | "gpsStatus"
  | "latitude"
  | "longitude"
  | "speed"
  | "course"
  | "accStatus"
  | "powerStatus"
  | "gsmSignal"
  | "batteryVoltage"
  | "satellites"
  | "statusHex"
  | "rawData"
  | "metadata"
  | "createdAt"
>;


export interface UserDeviceAttributes {
  id: string;
  userId: string;
  deviceId: string;
  name?: string | null;
  simNumber?: string | null;
  deviceType?: string | null;
  metadata?: Record<string, any> | null;
  notificationStatus?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserDeviceCreationAttributes = Optional<
  UserDeviceAttributes,
  "id" | "name" | "simNumber" | "deviceType" | "metadata" | "notificationStatus" | "createdAt" | "updatedAt"
>;

export interface EntityAttributes {
  id: string;
  name: string;
  type: string;
  deviceId?: string | null;
  ownerId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EntityCreationAttributes = Optional<
  EntityAttributes,
  "id" | "ownerId" | "metadata" | "createdAt" | "updatedAt"
>;

export interface CircleEntityAttributes {
  id: string;
  entityId: string;
  circleId: string;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CircleEntityCreationAttributes = Optional<
  CircleEntityAttributes,
  "id" | "metadata" | "createdAt" | "updatedAt"
>;

export interface RelationshipAttributes {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type RelationshipCreationAttributes = Optional<
  RelationshipAttributes,
  "id" | "createdAt" | "updatedAt"
>;
