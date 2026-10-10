import apiClient from "../api/apiClient";
import { TRACKER_ENDPOINT } from "../api/endpoints";

export const TrackerService = {
  async getTrackerData(params?: {
    page?: number;
    limit?: number;
    deviceId?: string;
    gpsStatus?: "A" | "V";
    startDate?: string;
    endDate?: string;
  }) {
    return await apiClient.get(TRACKER_ENDPOINT.GET_TRACKER_DATA, { params });
  },

  async getTrackerByDeviceId(
    deviceId: string | number,
    params?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return await apiClient.get(TRACKER_ENDPOINT.GET_TRACKER_BY_DEVICE_ID(deviceId), { params });
  },

  async getDeviceIds() {
    return await apiClient.get(TRACKER_ENDPOINT.GET_DEVICE_IDS);
  },

  async addTrackingDevice(deviceId: string , name : string){
    return await apiClient.post(TRACKER_ENDPOINT.ADD_TRACKING_DEVICE, {deviceId : deviceId , name : name});
  },

  async getAllTrackingDevices() {
    return await apiClient.get(TRACKER_ENDPOINT.GET_ALL_TRACKING_DEVICES);
  },

  async deleteTrackingDevice(deviceId: string | number) {
    return await apiClient.delete(TRACKER_ENDPOINT.DELETE_TRACKING_DEVICE(deviceId));
  },

  async getDeviceLiveStatus(deviceId: string | number) {
    return await apiClient.get(TRACKER_ENDPOINT.GET_DEVICE_LIVE_STATUS(deviceId));
  },
};