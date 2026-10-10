import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SubscriptionService } from '../Services/SubscriptionService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const SUBSCRIPTION_KEYS = {
    all: ['subscription'] as const,
    plans: () => [...SUBSCRIPTION_KEYS.all, 'plans'] as const,
    currentPlan: () => [...SUBSCRIPTION_KEYS.all, 'currentPlan'] as const,
};

// ================================= GET: All Plans ================================
export const useGetAllPlans = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_KEYS.plans(),
        queryFn: () => SubscriptionService.getAllPlans(),
    });
};

// =============================== GET: Current Plan ================================
export const useGetCurrentPlan = () => {
    return useQuery({
        queryKey: SUBSCRIPTION_KEYS.currentPlan(),
        queryFn: () => SubscriptionService.getCurrentPlan(),
    });
};

// ================================ SUBSCRIBE TO PLAN ================================
export const useSubscribeToPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planId: string) => SubscriptionService.subscribeToPlan(planId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEYS.currentPlan() });
        },
    });
};