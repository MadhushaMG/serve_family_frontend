import apiClient from "../api/apiClient";
import { AUTH_ENDPOINTS } from "../api/endpoints";


export const AccountServices = {
  /**
   * POST /api/auth/request-delete-account
   * No params — generates a 6-digit OTP and emails it to the user's
   * registered address. 400 if no email is on file, 404 if user not found.
   */
  async requestDeleteAccount() {
    return apiClient.post(AUTH_ENDPOINTS.REQUEST_DELETE_ACCOUNT);
  },

  /**
   * POST /api/auth/confirm-delete-account
   * Body: { code: string } — verifies the OTP and, if valid, permanently
   * deletes the account and all related data. 400 if the OTP is invalid
   * or expired.
   */
  async confirmDeleteAccount(code: string) {
    return apiClient.post(AUTH_ENDPOINTS.CONFIRM_DELETE_ACCOUNT, { code });
  },
};