import apiClient from "../api/apiClient";
import { SETTINGS_ENDPOINT } from "../api/endpoints";

export const NotificationSettingsService = {
  async getNotificationSettings(circleId: string | number) {
    return await apiClient.get(SETTINGS_ENDPOINT.GET_NOTIFICATION_SETTINGS(circleId));
  },

  async updateNotificationSettings(
    circleId: string | number,
    settings: any
  ) {
    return await apiClient.put(SETTINGS_ENDPOINT.UPDATE_NOTIFICATION_SETTINGS(circleId), { settings });
  },
};