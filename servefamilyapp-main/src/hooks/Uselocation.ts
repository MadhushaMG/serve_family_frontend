import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocationService } from '../Services/LocationService';
import { CIRCLE_KEYS } from './Usecircle';

// ─── Mutations ─────────────────────────────────────────────────────────────

// ========================== CREATE LOCATION FOR CIRCLE ========================
export const useCreateLocationForCircle = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            name: string;
            latitude: number;
            longitude: number;
            metadata?: object;
            isCommonLocation?: boolean;
        }) => LocationService.createLocationForCircle(circleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// ========================== UPDATE LOCATION FOR CIRCLE ========================
export const useUpdateLocationForCircle = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            locationId,
            data,
        }: {
            locationId: string | number;
            data: {
                name?: string;
                latitude?: number;
                longitude?: number;
                metadata?: object;
                isCommonLocation?: boolean;
            };
        }) => LocationService.updateLocationForCircle(circleId, locationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// ============================== ASSIGN LOCATION ================================
export const useAssignLocation = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { locationId: string; userId?: string }) =>
            LocationService.assignLocation(circleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// ============================= UNASSIGN LOCATION ===============================
export const useUnassignLocation = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { locationId: string; userId?: string }) =>
            LocationService.unassignLocation(circleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// =============================== DELETE LOCATION ================================
export const useDeleteLocation = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (locationId: string | number) =>
            LocationService.deleteLocation(circleId, locationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.detail(circleId) });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// ============================ MARK LOCATION REACHED ==============================
export const useMarkLocationReached = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { locationId: string; latitude: number; longitude: number }) =>
            LocationService.markLocationReached(circleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};

// ============================== MARK LOCATION LEFT ================================
export const useMarkLocationLeft = (circleId: string | number) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { locationId: string }) =>
            LocationService.markLocationLeft(circleId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.memberLocations(circleId) });
        },
    });
};