import { useMutation } from '@tanstack/react-query';
import { QRservices } from '../Services/QrServices';


// =================================== GENERATE QR PROFILE ====================================
export interface GenerateQrPayload {
  displayName: string;
  phoneNumber: string;
  otherDetails: string;
  showDetails: boolean;
  isActive: boolean;
}

export const useGenerateQr = () => {
  return useMutation({
    mutationFn: (data: GenerateQrPayload) =>
      QRservices.generateQr(
        data.displayName,
        data.phoneNumber,
        data.otherDetails,
        data.showDetails,
        data.isActive,
      ),
  });
};