import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InviteService } from '../Services/InviteService';
import { CIRCLE_KEYS } from './Usecircle';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const INVITE_KEYS = {
    all: ['invites'] as const,
    pending: () => [...INVITE_KEYS.all, 'pending'] as const,
    pendingForCircle: (circleId: string) => [...INVITE_KEYS.all, 'pending', circleId] as const,
};

// ============================== GET: Pending Invites ================================
export const usePendingInvites = () => {
    return useQuery({
        queryKey: INVITE_KEYS.pending(),
        queryFn: () => InviteService.PendingInvites(),
    });
};

// ========================= GET: List Pending Invites (Circle) =========================
export const useListPendingInvites = (circleId: string) => {
    return useQuery({
        queryKey: INVITE_KEYS.pendingForCircle(circleId),
        queryFn: () => InviteService.ListPendingInvites(circleId),
        enabled: !!circleId,
    });
};

// ================================= INVITE TO CIRCLE ==================================
export const useInviteToCircle = (circleId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            email,
            role,
            nickname,
        }: {
            email: string;
            role: string;
            nickname: string;
        }) => InviteService.InviteToCircle(circleId, email, role, nickname),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVITE_KEYS.pendingForCircle(circleId) });
        },
    });
};

// =================================== ACCEPT INVITE ====================================
export const useAcceptInvite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (circleId: string) => InviteService.AcceptInvite(circleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVITE_KEYS.pending() });
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        },
    });
};

// =================================== REJECT INVITE ====================================
export const useRejectInvite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (circleId: string) => InviteService.RejectInvite(circleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INVITE_KEYS.pending() });
        },
    });
};

// =================================== JOIN BY CODE =====================================
export const useJoinByCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (invitationCode: string) => InviteService.JoinByCode(invitationCode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CIRCLE_KEYS.all });
        },
    });
};