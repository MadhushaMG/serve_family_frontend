import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { AuthServices } from "../Services/AuthService";


// =========================== Hook ================================
export const useLogout = () => {
    const logout = useAuthStore((state) => state.logout);
    const refreshToken = useAuthStore.getState().refreshToken;

    const logoutMutation = useMutation({
        mutationFn: async () => {
            if (refreshToken) {
                await AuthServices.LogOut(refreshToken);
            }
        },
        
        onSettled: async () => {
            try {
                await logout();
            } catch (err) {
                console.error("Error clearing auth store:", err);
            }
        },
    });

    return {
        handleLogout: () => logoutMutation.mutate(),
        isLoggingOut: logoutMutation.isPending,
    };
};