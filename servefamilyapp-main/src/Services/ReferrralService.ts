import apiClient from "../api/apiClient";
import { REFERRAL_ENDPOINT } from "../api/endpoints";

export const ReferralService = {
  async generateReferralLink() {
    return await apiClient.post(REFERRAL_ENDPOINT.GENERATE_REFERRAL_LINK);
  },

  async getReferrerInfo(code: string) {
    return await apiClient.get(REFERRAL_ENDPOINT.GET_REFERRER_INFO(code));
  },


};