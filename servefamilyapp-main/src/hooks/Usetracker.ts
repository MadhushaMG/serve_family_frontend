import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrackerService } from '../Services/TrackerService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const TRACKER_KEYS = {
    all: ['tracker'] as const,
    data: (params?: object) => [...TRACKER_KEYS.all, 'data', params] as const,
    byDevice: (deviceId: string | number, params?: object) =>
        [...TRACKER_KEYS.all, 'device', deviceId, params] as const,
    deviceIds: () => [...TRACKER_KEYS.all, 'deviceIds'] as const,
    allDevices: () => [...TRACKER_KEYS.all, 'allDevices'] as const,
    liveStatus: (deviceId: string | number) => [...TRACKER_KEYS.all, 'liveStatus', deviceId] as const,
};

// ================================= GET: Tracker Data ============================
export const useGetTrackerData = (params?: {
    page?: number;
    limit?: number;
    deviceId?: string;
    gpsStatus?: 'A' | 'V';
    startDate?: string;
    endDate?: string;
}) => {
    return useQuery({
        queryKey: TRACKER_KEYS.data(params),
        queryFn: () => TrackerService.getTrackerData(params),
    });
};

// ============================ GET: Tracker By Device Id ==========================
export const useGetTrackerByDeviceId = (
    deviceId: string | number,
    params?: { page?: number; limit?: number; startDate?: string; endDate?: string }
) => {
    return useQuery({
        queryKey: TRACKER_KEYS.byDevice(deviceId, params),
        queryFn: () => TrackerService.getTrackerByDeviceId(deviceId, params),
        enabled: !!deviceId,
    });
};

// ================================= GET: Device Ids ==============================
export const useGetDeviceIds = () => {
    return useQuery({
        queryKey: TRACKER_KEYS.deviceIds(),
        queryFn: () => TrackerService.getDeviceIds(),
    });
};

// ============================== GET: All Tracking Devices ========================
export const useGetAllTrackingDevices = () => {
    return useQuery({
        queryKey: TRACKER_KEYS.allDevices(),
        queryFn: () => TrackerService.getAllTrackingDevices(),
    });
};

// ============================ GET: Device Live Status ============================
export const useGetDeviceLiveStatus = (deviceId: string | number, pollingInterval = 0) => {
    return useQuery({
        queryKey: TRACKER_KEYS.liveStatus(deviceId),
        queryFn: () => TrackerService.getDeviceLiveStatus(deviceId),
        enabled: !!deviceId,
        refetchInterval: pollingInterval > 0 ? pollingInterval : false,
        refetchIntervalInBackground: true,
    });
};

// ================================ ADD TRACKING DEVICE =============================
export const useAddTrackingDevice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, name }: { deviceId: string; name: string }) =>
            TrackerService.addTrackingDevice(deviceId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.allDevices() });
            queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.deviceIds() });
        },
    });
};

// ============================== DELETE TRACKING DEVICE =============================
export const useDeleteTrackingDevice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (deviceId: string | number) => TrackerService.deleteTrackingDevice(deviceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.allDevices() });
            queryClient.invalidateQueries({ queryKey: TRACKER_KEYS.deviceIds() });
        },
    });
};