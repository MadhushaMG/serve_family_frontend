import { useMutation } from '@tanstack/react-query';
import { PaymentService } from '../Services/PaymentService';

// ================================ IPAY CALLBACK ==================================
export const useIPayCallback = () => {
    return useMutation({
        mutationFn: (data: {
            status: string;
            order_id: string;
            transaction_id: string;
            amount: number;
        }) => PaymentService.iPayCallback(data),
    });
};