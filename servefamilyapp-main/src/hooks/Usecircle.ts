import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleService } from '../Services/Circleservice';
import { StoreCirclePrivacy, useAuthStore } from '../store/authStore';

export const CIRCLE_KEYS = {
    all: ['circles'] as const,
    lists: () => [...CIRCLE_KEYS.all, 'list'] as const,
    detail: (id: string | number) => [...CIRCLE_KEYS.all, 'detail', id] as const,
    memberLocations: (id: string | number) => [...CIRCLE_KEYS.all, 'locations', id] as const,
    relationships: () => [...CIRCLE_KEYS.all, 'relationships'] as const,
};

export const useGetCircles = (pollingInterval = 0) => {
    return useQuery({
        queryKey: ["circles"],
        queryFn: async () => {
            const response = await CircleService.GetCircles();
            if (response && response.success && Array.isArray(response.data)) {
                return response.data;
            }
            return [];
        },
        refetchInterval: pollingInterval > 0 ? pollingInterval : false,
        refetchIntervalInBackground: true,
        staleTime: 2000,
    });
};

export const useGetCircleDetails = () => {
    const selectedCircleId = useAuthStore((state) => state.activeCircleId);
    return useQuery({
        queryKey: CIRCLE_KEYS.detail(selectedCircleId as string | number),
        queryFn: () => CircleService.GetCircleDetails(selectedCircleId as string | number),
        enabled: !!selectedCircleId,
    });
};

export const useGetMemberLocations = (pollingInterval = 0) => {
    const selectedCircleId = useAuthStore((state) => state.activeCircleId);
    return useQuery({
        queryKey: CIRCLE_KEYS.memberLocations(selectedCircleId as string | number),
        queryFn: () => CircleService.GetMemberLocation(selectedCircleId as string | number),
        enabled: !!selectedCircleId,
        refetchInterval: pollingInterval > 0 ? pollingInterval : false,
        refetchIntervalInBackground: true,
    });
};

export const useGetRelationshipTypes = () => {
    return useQuery({
        queryKey: CIRCLE_KEYS.relationships(),
        queryFn: () => CircleService.GET_RELATIONSHIPS_TYPE(),
    });
};

export const useCreateCircle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; metadata?: JSON }) =>
            CircleService.CreateCircle(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        },
    });
};

export const useUpdateCircle = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name?: string; metadata?: JSON }) =>
            CircleService.UpdateCircle(circleId ?? "", data),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
            }
        },
    });
};

export const useDeleteCircle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (circleId: string | number) =>
            CircleService.DeleteCircle(circleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        },
    });
};

export const useLeaveCircle = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (circleId: string | number) =>
            CircleService.LeaveCircle(circleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        },
    });
};

export const useChangeMemberRole = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ memberId, newRole }: { memberId: string | number; newRole: string }) =>
            CircleService.ChangeMemberRole(circleId ?? "", memberId, newRole),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useChangeMemberNickname = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ memberId, newNickname }: { memberId: string | number; newNickname: string }) =>
            CircleService.ChangeMemberNickname(circleId ?? "", memberId, newNickname),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useChangeMemberRelationship = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ memberId, newRelationship }: { memberId: string | number; newRelationship: string }) =>
            CircleService.ChangeMemberRelationship(circleId ?? "", memberId, newRelationship),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useRemoveMemberRelationship = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string | number) =>
            CircleService.RemovememberRelationship(circleId ?? "", memberId),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useRemoveMember = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (memberId: string | number) =>
            CircleService.RemoveMember(circleId ?? "", memberId),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useAddTrackingDevice = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, name, type }: { deviceId: string | number; name: string; type?: any }) =>
            CircleService.AddTrackingDevice(circleId ?? "", deviceId, name, type),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useUpdateTrackingDevice = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ deviceId, name }: { deviceId: string | number; name: string }) =>
            CircleService.UpdateTrackingDeviceDetails(circleId ?? "", deviceId, name),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useRemoveTrackingDevice = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (deviceId: string | number) =>
            CircleService.RemoveTrackingDevice(circleId ?? "", deviceId),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useUpdateNotificationSettings = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (settings: { [key: string]: any }) =>
            CircleService.UpdateNotificationSettings(circleId ?? "", settings),
        onSuccess: () => {
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        },
    });
};

export const useGenerateInvitationCode = () => {
    return useMutation({
        mutationFn: (circleId: string | number) =>
            CircleService.genarateInvitationCode(circleId),
    });
};

export const useUpdateCirlePrivacy = (circleId: string | number | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (privacy: StoreCirclePrivacy) => 
            CircleService.UPDATE_PRIVACY(circleId ?? "", privacy.shareLocation, privacy.shareBattery, privacy.shareAvatar),
        onSuccess: (data) => {
            if (data?.data) {
                useAuthStore.getState().setUpdatePrivacy({ 
                    shareAvatar: data.data.shareAvatar, 
                    shareBattery: data.data.shareBattery, 
                    shareLocation: data.data.shareLocation 
                });
            }
            if (circleId) {
                queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            }
        }
    });
};