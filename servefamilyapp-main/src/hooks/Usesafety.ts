import { useMutation } from '@tanstack/react-query';
import { SafetyService } from '../Services/SafetyService';

// ============================== UPDATE BATTERY LEVEL ================================
export const useUpdateBatteryLevel = () => {
    return useMutation({
        mutationFn: (data: { batteryLevel: number; deviceId: string }) =>
            SafetyService.updateBatteryLevel(data),
    });
};

// ============================= SEND LOW BATTERY ALERT ================================
export const useSendLowBatteryAlert = () => {
    return useMutation({
        mutationFn: (data: { batteryLevel: number; deviceId: string; threshold?: number }) =>
            SafetyService.sendLowBatteryAlert(data),
    });
};

// =================================== REPORT CRASH ====================================
export const useReportCrash = () => {
    return useMutation({
        mutationFn: (data: {
            latitude?: number;
            longitude?: number;
            crashDetails?: string;
            deviceId?: string;
        }) => SafetyService.reportCrash(data),
    });
};

// =================================== SEND SOS ALERT ====================================
export const useSendSosAlert = () => {
    return useMutation({
        mutationFn: (data: { message?: string; latitude?: number; longitude?: number }) =>
            SafetyService.sendSosAlert(data),
    });
};