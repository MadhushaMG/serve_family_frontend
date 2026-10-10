import { useQuery, useMutation } from '@tanstack/react-query';
import { ReferralService } from '../Services/ReferrralService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const REFERRAL_KEYS = {
    all: ['referral'] as const,
    referrerInfo: (code: string) => [...REFERRAL_KEYS.all, 'referrerInfo', code] as const,
};

// ============================ GENERATE REFERRAL LINK =============================
export const useGenerateReferralLink = () => {
    return useMutation({
        mutationFn: () => {
            const response: any = ReferralService.generateReferralLink()

            return response?.data ?? response;
        },
    });
};

// ============================== GET: Referrer Info ================================
export const useGetReferrerInfo = (code: string) => {
    return useQuery({
        queryKey: REFERRAL_KEYS.referrerInfo(code),
        queryFn: () => ReferralService.getReferrerInfo(code),
        enabled: !!code,
    });
};



