import apiClient from "../api/apiClient";
import { CIRCLE_ENDPOINTS } from "../api/endpoints";
import { CircleNotificationSettings } from "../types/Alltypes";


export const CircleService = {
  async UPDATE_PRIVACY(circleId: string | number, shareLocation: boolean, shareBattery: boolean, shareAvatar: boolean) {
    return await apiClient.put(CIRCLE_ENDPOINTS.UPDATE_PRIVACY(circleId), {
      shareLocation: shareLocation,
      shareBattery: shareBattery,
      shareAvatar: shareAvatar
    })
  },
  async GET_RELATIONSHIPS_TYPE() {
    return await apiClient.get(CIRCLE_ENDPOINTS.GET_ALL_RELATIONSHIP_ALL);
  },

  async GetMemberLocation(circleId: string | number) {
    return await apiClient.get(CIRCLE_ENDPOINTS.GET_MEMBER_LOCATIONS(circleId));
  },

  async AddTrackingDevice(circleId: string | number, deviceId: string | number, name: string, type?: any) {
    return await apiClient.post(CIRCLE_ENDPOINTS.ADD_TRACKING_DEVICE(circleId), { deviceId, name, type });
  },

  async UpdateTrackingDeviceDetails(circleId: string | number, deviceId: string | number, name: string) {
    return await apiClient.put(CIRCLE_ENDPOINTS.UPDATE_TRACKING_DEVICE_DETAILS(circleId, deviceId), { name });
  },

  async RemoveTrackingDevice(circleId: string | number, deviceId: string | number) {
    return await apiClient.delete(CIRCLE_ENDPOINTS.REMOVE_TRACKING_DEVICE(circleId, deviceId));
  },

  async GetCircles() {
    return await apiClient.get(CIRCLE_ENDPOINTS.LIST);
  },

  async CreateCircle(data: { name: string; metadata?: JSON }) {
    return await apiClient.post(CIRCLE_ENDPOINTS.CREATE, data);
  },
  async GetCircleDetails(circleId: string | number) {
    return await apiClient.get(CIRCLE_ENDPOINTS.DETAILS(circleId));
  },

  async UpdateCircle(circleId: string | number, data: { name?: string; metadata?: JSON }) {
    return await apiClient.put(CIRCLE_ENDPOINTS.UPDATE(circleId), data);
  },

  async DeleteCircle(circleId: string | number) {
    return await apiClient.delete(CIRCLE_ENDPOINTS.DELETE(circleId), {
      validateStatus: (status) => status >= 200 && status < 300,
    });
  },


  async UpdateNotificationSettings(circleId: string | number, settings: { [key: string]: CircleNotificationSettings }) {
    console.log(settings , circleId)
    return await apiClient.put(CIRCLE_ENDPOINTS.UPDATE_NOTIFICATIONS_SETTINGS(circleId), settings);
  },

  async genarateInvitationCode(circleId: string | number) {
    return await apiClient.post(CIRCLE_ENDPOINTS.GENERATE_INVITATION_CODE(circleId));
  },

  async ChangeMemberRole(circleId: string | number, memberId: string | number, newRole: string) {
    return await apiClient.put(CIRCLE_ENDPOINTS.MEMBERS_ROLE_CHANGE(circleId, memberId), { role: newRole });
  },

  async ChangeMemberNickname(circleId: string | number, memberId: string | number, newNickname: string) {
    return await apiClient.put(CIRCLE_ENDPOINTS.MEMBERS_NIKNAME_CHANGE(circleId, memberId), { nickname: newNickname });
  },

  async ChangeMemberRelationship(circleId: string | number, memberId: string | number, newRelationship: string) {
    return await apiClient.put(CIRCLE_ENDPOINTS.MEMBERS_RELATINSHIP_CHANGE(circleId, memberId), { relationship: newRelationship });
  },

  async RemovememberRelationship(circleId: string | number, memberId: string | number) {
    return await apiClient.delete(CIRCLE_ENDPOINTS.DELETE_MEMBERS_RELATIONSHIP(circleId, memberId));
  },

  async RemoveMember(circleId: string | number, memberId: string | number) {
    return await apiClient.delete(CIRCLE_ENDPOINTS.REMOVE_MEMBER(circleId, memberId));
  },

  async LeaveCircle(circleId: string | number) {
    return await apiClient.delete(CIRCLE_ENDPOINTS.LEAVE(circleId), {
      validateStatus: (status) => status >= 200 && status < 300,
    });
  },

};


