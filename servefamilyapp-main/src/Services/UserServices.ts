import apiClient from "../api/apiClient";
import axiosInstance from "../api/axiosInstance";
import { USER_ENDPOINTS } from "../api/endpoints";

export const UserServices = {
  async UpdateLiveLocation(circleId: string | number, latitude: number, longitude: number, name: string, speed: number) {
    const response = apiClient.post(USER_ENDPOINTS.UPDATE_LIVE_LOCATION(circleId), { latitude: latitude, longitude: longitude, name: name, speed: speed })
    return response;
  },

  async GetProfile() {
    return await apiClient.get(USER_ENDPOINTS.PROFILE);
  },

  async UpdateProfile(
    name?: string,
    metadata?: any,
    profileImage?: { uri: string; type?: string; name?: string },
  ) {
    if (profileImage?.uri) {
      const formData = new FormData();
      if (name !== undefined && name !== "") {
        formData.append("name", name);
      }
      if (metadata !== undefined && metadata !== "") {
        const metaStr =
          typeof metadata === "string" ? metadata : JSON.stringify(metadata);
        formData.append("metadata", metaStr);
      }
      formData.append(
        "profileImage",
        {
          uri: profileImage.uri,
          name: profileImage.name ?? "profile.webp",
          type: profileImage.type ?? "image/webp",
        } as any,
      );
      const response = await axiosInstance.put(
        USER_ENDPOINTS.UPDATE_PROFILE,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    }
    return await apiClient.put(USER_ENDPOINTS.UPDATE_PROFILE, {
      name,
      metadata,
    });
  },

  async GetPendingRequests() {
    const response = await apiClient.get(USER_ENDPOINTS.PENDING_REQUESTS);
    return response;
  },

  async GetAsignLocations() {
    const response = await apiClient.get(USER_ENDPOINTS.ASSIGNED_LOCATIONS);
    return response;
  },

  async UpdateCurruntLocation(circleId: string | number, latitude: number, longitude: number, name: string, metadata: any) {
    const response = await apiClient.post(USER_ENDPOINTS.UPDATE_CURRUNT_LOCATION(circleId), { latitude: latitude, longitude: longitude, name: name, metadata: metadata })
    return response;
  },

  async GetLocationHistory(limit: number = 100, offset: number = 0  , filter :any ) {
    const response = await apiClient.get(USER_ENDPOINTS.GET_LOCATION_HISTORY(limit, offset , filter));
    return response;
  },
  async SendHeartbeart(data: any) {
    const response = await apiClient.post(USER_ENDPOINTS.SEND_HEARTBEART, data)
    return response;
  }
};
