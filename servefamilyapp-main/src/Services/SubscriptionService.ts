import apiClient from "../api/apiClient";
import { SUBSCRIPTION_ENDPOINT } from "../api/endpoints";

export const SubscriptionService = {
  async getAllPlans() {
    return await apiClient.get(SUBSCRIPTION_ENDPOINT.GET_ALL_PLANS);
  },

  async getCurrentPlan() {
    return await apiClient.get(SUBSCRIPTION_ENDPOINT.GET_CURRENT_PLAN);
  },

  async subscribeToPlan(planId: string) {
    return await apiClient.post(SUBSCRIPTION_ENDPOINT.SUBSCRIBE_TO_PLAN, { planId });
  },
};