import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { AUTH_ENDPOINTS } from "./endpoints";
import { useAuthStore } from "../store/authStore";
import { router } from "expo-router";

// ========================= Base URL =============================
// export const API_BASE_URL = "https://api.servefamily.com/api";
export const API_BASE_URL = "https://testapi.servefamily.com/api";

// ========================== Axios instance =======================================
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// =========================== URLs that must never trigger a token refresh ===================================
const SKIP_REFRESH_URLS = new Set([
  AUTH_ENDPOINTS.REFRESH,
  AUTH_ENDPOINTS.LOGIN,
  AUTH_ENDPOINTS.REGISTER,
  AUTH_ENDPOINTS.GOOGLE_LOGIN,
  AUTH_ENDPOINTS.FORGOT_PASSWORD,
  AUTH_ENDPOINTS.VERIFY_RESET_PASSWORD_OTP,
  AUTH_ENDPOINTS.RESET_PASSWORD,
  AUTH_ENDPOINTS.APPLE_LOGIN,
]);

// ================================= Extend Axios config type to carry the retry flag ===============================
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// ─── Token refresh state ───────────────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error("No refresh token available.");

  const { data } = await axios.post(
    `${API_BASE_URL}${AUTH_ENDPOINTS.REFRESH}`,
    { refreshToken }
  );

  const nextAccessToken = data.accessToken ?? data.token;
  const nextRefreshToken = data.refreshToken ?? refreshToken;

  if (!nextAccessToken) {
    throw new Error("Refresh response missing access token.");
  }

  useAuthStore.getState().setAuthTokens(nextAccessToken, nextRefreshToken);
  return nextAccessToken as string;
};


const forceLogout = async () => {
  useAuthStore.getState().logout();
  router.replace("/WalkthroughScreen");
};

// =================== Request interceptor — attach access token ==================
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ================================ Response interceptor — handle 401 + token refresh ==================================
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;


    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      SKIP_REFRESH_URLS.has(originalRequest.url ?? "")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      await forceLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default axiosInstance;