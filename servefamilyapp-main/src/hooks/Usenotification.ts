import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationService } from '../Services/NotificationServices';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const NOTIFICATION_KEYS = {
    all: ['notifications'] as const,
    list: (params?: object) => [...NOTIFICATION_KEYS.all, 'list', params] as const,
};

// ============================== GET: Notifications ==================================
export const useGetNotifications = (params?: { page?: number; perPage?: number; read?: boolean, }, pollingInterval = 0) => {
    return useQuery({
        queryKey: NOTIFICATION_KEYS.list(params),
        queryFn: () => NotificationService.getNotifications(params),
        refetchInterval: pollingInterval > 0 ? pollingInterval : false,
        refetchIntervalInBackground: true,
        staleTime: 0,
    });
};

// ============================== STORE FIREBASE TOKEN =================================
export const useStoreFirebaseToken = () => {
    return useMutation({
        mutationFn: ({
            token,
            deviceId,
            deviceType,
            deviceDetails,
        }: {
            token: string;
            deviceId: string;
            deviceType: string;
            deviceDetails: {
                os: 'ios' | 'android' | 'windows' | 'macos' | 'web';
                version: string | number;
                brand: string;
                model: string;
                appVersion: string;
            };
        }) => NotificationService.storeFirebaseToken(token, deviceId, deviceType, deviceDetails),
    });
};

// ================================= MARK ALL AS READ ===================================
export const useMarkAllAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => NotificationService.markAllAsRead(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
        },
    });
};

// =================================== MARK AS READ =====================================
export const useMarkAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (notificationId: string) => NotificationService.markAsRead(notificationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
        },
    });
};