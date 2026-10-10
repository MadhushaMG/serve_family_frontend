import apiClient from "../api/apiClient";
import { LOGS_ENDPOINT } from "../api/endpoints";

export const LogsService = {
  async getLogs(params?: {
    page?: number;
    limit?: number;
    method?: "POST" | "PUT" | "DELETE" | "PATCH";
    statusCode?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return await apiClient.get(LOGS_ENDPOINT.GET_LOG, { params });
  },
};