import { useMutation } from "@tanstack/react-query";
import { AccountServices } from "../Services/Accountservices";

// =================================== REQUEST DELETE ACCOUNT (sends OTP) ====================================
export const useRequestDeleteAccount = () => {
  return useMutation({
    mutationFn: () => AccountServices.requestDeleteAccount(),
  });
};

// =================================== CONFIRM DELETE ACCOUNT (verifies OTP + deletes) ====================================
export const useConfirmDeleteAccount = () => {
  return useMutation({
    mutationFn: (code: string) => AccountServices.confirmDeleteAccount(code),
  });
};