import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserServices } from '../Services/UserServices';
import { useAuthStore } from '../store/authStore';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const USER_KEYS = {
    all: ['user'] as const,
    profile: () => [...USER_KEYS.all, 'profile'] as const,
    pendingRequests: () => [...USER_KEYS.all, 'pendingRequests'] as const,
    assignedLocations: () => [...USER_KEYS.all, 'assignedLocations'] as const,
    locationHistory: (limit: number, offset: number, filter?: any) =>
        [...USER_KEYS.all, 'locationHistory', limit, offset, filter] as const,
};

// ================================= GET: Profile ==================================
export const useGetProfile = () => {
    return useQuery({
        queryKey: USER_KEYS.profile(),
        queryFn: () => UserServices.GetProfile(),
        
    });
};

// ============================== GET: Pending Requests =============================
export const useGetPendingRequests = () => {
    return useQuery({
        queryKey: USER_KEYS.pendingRequests(),
        queryFn: () => UserServices.GetPendingRequests(),
    });
};

// ============================= GET: Assigned Locations =============================
export const useGetAssignedLocations = () => {
    return useQuery({
        queryKey: USER_KEYS.assignedLocations(),
        queryFn: () => UserServices.GetAsignLocations(),
    });
};

// ============================== GET: Location History ==============================
export const useGetLocationHistory = (limit: number = 100, offset: number = 0, filter?: any) => {
    return useQuery({
        queryKey: USER_KEYS.locationHistory(limit, offset, filter),
        queryFn: () => UserServices.GetLocationHistory(limit, offset, filter),
    });
};

// ================================ UPDATE LIVE LOCATION =============================
export const useUpdateLiveLocation = (circleId: string | number) => {
    return useMutation({
        mutationFn: ({
            latitude,
            longitude,
            name,
            speed,
        }: {
            latitude: number;
            longitude: number;
            name: string;
            speed: number;
        }) => UserServices.UpdateLiveLocation(circleId, latitude, longitude, name, speed),
    });
};

// =================================== UPDATE PROFILE ================================
export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            name,
            metadata,
            profileImage,
        }: {
            name?: string;
            metadata?: any;
            profileImage?: { uri: string; type?: string; name?: string };
        }) => UserServices.UpdateProfile(name, {address : metadata}, profileImage),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_KEYS.profile() });
        },
    });
};

// ============================== UPDATE CURRENT LOCATION ==============================
export const useUpdateCurrentLocation = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            latitude,
            longitude,
            name,
            metadata,
        }: {
            latitude: number;
            longitude: number;
            name: string;
            metadata: any;
        }) => UserServices.UpdateCurruntLocation(circleId, latitude, longitude, name, metadata),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USER_KEYS.assignedLocations() });
        },
    });
};

// ==================================== SEND HEARTBEAT ==================================
export const useSendHeartbeat = () => {
    return useMutation({
        mutationFn: (data: any) => UserServices.SendHeartbeart(data),
    });
};