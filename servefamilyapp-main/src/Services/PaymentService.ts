import apiClient from "../api/apiClient";
import { PAYMENT_ENDPOINT } from "../api/endpoints";

export const PaymentService = {
  async iPayCallback(data: {
    status: string;
    order_id: string;
    transaction_id: string;
    amount: number;
  }) {
    return await apiClient.post(PAYMENT_ENDPOINT.IPAY_CALLBACK, data);
  },
};