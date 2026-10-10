import * as AppleAuth from "expo-apple-authentication";
import { AuthServices } from "../Services/AuthService";
import { UserServices } from "../Services/UserServices"; // Profile ලබා ගැනීමට
import { useAuthStore } from "../store/authStore";
import { getDeviceInfo } from "./deviceUtils";
import { flushPendingFcmToken } from "./permissions";

export interface AppleSignInResult {
  token: string;
  refreshToken: string;
  user: any;
}

const AppleAuthService = {
  signIn: async (): Promise<AppleSignInResult> => {
    let credential;
    try {
      credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED") {
        throw new Error("Apple sign-in was cancelled.");
      }
      throw new Error(err?.message ?? "Apple sign-in failed.");
    }

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token.");
    }

    const deviceDetails = await getDeviceInfo();

    const userPayload = {
      name: {
        firstName: credential.fullName?.givenName ?? "",
        lastName: credential.fullName?.familyName ?? "",
      },
      email: credential.email ?? null,
    };


    let response: any;
    try {
      response = await AuthServices.appleLogin(
        credential.identityToken,
        userPayload,
        null,
        deviceDetails.deviceId
      );
    } catch (err: any) {
      throw new Error(err?.message ?? "Backend Apple login request failed.");
    }

    if (!response?.success || !response?.token) {
      throw new Error(response?.message ?? "Apple login failed.");
    }


    const { setAuth, updateUser } = useAuthStore.getState();
    setAuth(
      { accessToken: response.token, refreshToken: response.refreshToken },
      response.user
    );


    try {
      const profileResponse = await UserServices.GetProfile();
      if (profileResponse?.success && profileResponse?.data) {
        updateUser(profileResponse.data);
      }
    } catch (profileErr) {
      console.warn("Profile sync failed, but login was successful:", profileErr);
    }

    flushPendingFcmToken();

    return {
      token: response.token,
      refreshToken: response.refreshToken,
      user: response.user,
    };
  },
};

export default AppleAuthService;