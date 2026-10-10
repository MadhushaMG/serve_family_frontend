import apiClient from "../api/apiClient"
import { QR_ENDPOINT } from "../api/endpoints"

export const QRservices = {
    async generateQr(displayName: string, phoneNumber: string, otherDetails: string, showDetails: boolean, isActive: boolean) {
      return apiClient.put(QR_ENDPOINT.GENERATE_QR, { displayName, phoneNumber, otherDetails, showDetails, isActive })
    }
}