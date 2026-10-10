import apiClient from "../api/apiClient";
import { CircleEntity } from "../types/models";

export interface UpdateDeviceParams {
    name: string;
}

export interface UpdateDeviceResponse {
    success: boolean;
    message: string;
    data: CircleEntity;
}

export interface RemoveDeviceResponse {
    success: boolean;
    message: string;
}

export const updateDevice = async (
    circleId: string,
    deviceId: string,
    params: UpdateDeviceParams
): Promise<UpdateDeviceResponse> => {
    return await apiClient.put(`/circles/${circleId}/devices/${deviceId}`, params);
};

export const removeDevice = async (
    circleId: string,
    deviceId: string
): Promise<RemoveDeviceResponse> => {
    return await apiClient.delete(`/circles/${circleId}/devices/${deviceId}`);
};
