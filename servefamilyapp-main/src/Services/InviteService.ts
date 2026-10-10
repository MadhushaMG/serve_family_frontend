import apiClient from "../api/apiClient";
import { INVITE_ENDPOINTS } from "../api/endpoints";

export const InviteService = {
  async InviteToCircle(circleId: string, email: string, role: string, nickname: string) {
    return await apiClient.post(INVITE_ENDPOINTS.INVITE_CIRCLE(circleId), { email, role, nickname });
  },

  async AcceptInvite(circleId: string) {
    return await apiClient.post(INVITE_ENDPOINTS.ACCEPT_INVITE(circleId));
  },
  async RejectInvite(circleId: string) {
    return await apiClient.post(INVITE_ENDPOINTS.REJECT_INVITE(circleId));
  },
  async PendingInvites() {
    return await apiClient.get(INVITE_ENDPOINTS.PENDING_INVITES);
  },
  async ListPendingInvites(circleId: string) {
    return await apiClient.get(INVITE_ENDPOINTS.LIST_PENDING_INVITES(circleId));
  },
  async JoinByCode(invitationCode: string) {
    return await apiClient.post(INVITE_ENDPOINTS.JOIN_BY_CODE, { code:invitationCode });
  },
};




