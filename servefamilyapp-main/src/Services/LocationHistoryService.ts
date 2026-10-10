import apiClient from "../api/apiClient";
import { LOCATION_HISTORY_ENDPOINT } from "../api/endpoints";

export const LocationHistoryService = {
  async getCircleLocationHistory(
    id: string | number,
    params?: {
      page?: number;
      perPage?: number;
    }
  ) {
    return await apiClient.get(LOCATION_HISTORY_ENDPOINT.GET_CIRCLE_LOCATION_HISTORY(id), { params });
  },
};