import apiClient from "../api/apiClient";
import { SAFETY_ENDPOINT } from "../api/endpoints";

export const SafetyService = {
  async updateBatteryLevel(data: { batteryLevel: number; deviceId: string }) {
    return await apiClient.post(SAFETY_ENDPOINT.UPDATE_BATTERY_LEVEL, data);
  },

  async sendLowBatteryAlert(data: {
    batteryLevel: number;
    deviceId: string;
    threshold?: number;
  }) {
    return await apiClient.post(SAFETY_ENDPOINT.SEND_LOW_BATTERY_ALERT, data);
  },

  async reportCrash(data: {
    latitude?: number;
    longitude?: number;
    crashDetails?: string;
    deviceId?: string;
  }) {
    return await apiClient.post(SAFETY_ENDPOINT.REPORT_CRASH, data);
  },

  async sendSosAlert(data: {
    message?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return await apiClient.post(SAFETY_ENDPOINT.SEND_SOS_ALERT, data);
  },
};