import { NotificationType, NotificationRecipientType, NotificationSettings } from "../db/types";

export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    [NotificationType.LOCATION_REACHED]: NotificationRecipientType.ALL_MEMBERS,
    [NotificationType.LOCATION_LEFT]: NotificationRecipientType.ALL_MEMBERS,
    [NotificationType.INVITE]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.MEMBERSHIP_ACCEPTED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.MEMBERSHIP_REJECTED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.MEMBER_REMOVED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.ROLE_UPDATED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.NICKNAME_UPDATED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.LOCATION_ADDED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.LOCATION_REMOVED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.LOCATION_ASSIGNED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.LOCATION_UNASSIGNED]: NotificationRecipientType.CREATOR_AND_ADMINS,
    [NotificationType.CRASH_DETECTED]: NotificationRecipientType.ALL_MEMBERS,
    [NotificationType.SOS_ALERT]: NotificationRecipientType.ALL_MEMBERS,
    [NotificationType.LOW_BATTERY]: NotificationRecipientType.ALL_MEMBERS,
  };
}
