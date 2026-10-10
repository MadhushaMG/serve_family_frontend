import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationSettingsService } from '../Services/SettingsService';


// ─── Query Keys ───────────────────────────────────────────────────────────────
export const SETTINGS_KEYS = {
    all: ['notificationSettings'] as const,
    detail: (circleId: string | number) => [...SETTINGS_KEYS.all, circleId] as const,
};

// ========================= GET: Notification Settings ======================
export const useGetNotificationSettings = (circleId: string | number) => {
    return useQuery({
        queryKey: SETTINGS_KEYS.detail(circleId),
        queryFn: async () => {
            const response = await NotificationSettingsService.getNotificationSettings(circleId);

            if (response && response.success) {
                return response.data;
            }
            return null;
        },
        enabled: !!circleId,
    });
};

// ====================== MUTATIONS ===============================

// ========================== UPDATE NOTIFICATION SETTINGS ========================
export const useUpdateNotificationSettings = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (settings: any) =>
            NotificationSettingsService.updateNotificationSettings(circleId, settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SETTINGS_KEYS.detail(circleId) });
        },
    });
};