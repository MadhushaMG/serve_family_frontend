import { useQuery } from '@tanstack/react-query';
import { LogsService } from '../Services/LogsService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const LOGS_KEYS = {
    all: ['logs'] as const,
    list: (params?: object) => [...LOGS_KEYS.all, 'list', params] as const,
};

// ================================= GET: Logs ==================================
export const useGetLogs = (params?: {
    page?: number;
    limit?: number;
    method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    statusCode?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
}) => {
    return useQuery({
        queryKey: LOGS_KEYS.list(params),
        queryFn: () => LogsService.getLogs(params),
    });
};