import apiClient from "../api/apiClient";
import { NOTIFICATION_ENDPOINTS } from "../api/endpoints";

export const NotificationService = {
  async storeFirebaseToken(token: string,
    deviceId: string,
    deviceType: string, deviceDetails: { os: "ios" | "android" | "windows" | "macos" | "web"; version: string | number; brand: string; model: string; appVersion: string; }) {
    return await apiClient.post(NOTIFICATION_ENDPOINTS.STORE_FIREBASE_TOKEN, { token: token, deviceId: deviceId , deviceType : deviceType , deviceDetails : deviceDetails });
  },

  async getNotifications(params?: {
    page?: number;
    perPage?: number; 
    read?: boolean;
  }) {
    return await apiClient.get(NOTIFICATION_ENDPOINTS.GET_NOTIFICATIONS, { params });
  },

  async markAllAsRead(userId: string) {
    return await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_ALL_AS_READ);
  },

  async markAsRead(notificationId: string) {
    return await apiClient.put(NOTIFICATION_ENDPOINTS.MARK_AS_READ(notificationId));
  },
};