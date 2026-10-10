import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthServices } from '../Services/AuthService';


// ============================================================
// CONFIGURATION CONSTANTS
// ============================================================
const WEB_CLIENT_ID = "150224001782-n3jpr1pbihe9f2n60b8c5dh2rr9p7tjv.apps.googleusercontent.com";
const IOS_CLIENT_ID = "150224001782-nvkesb6r3p8tpvengoveen1g5ekjmj86.apps.googleusercontent.com";


// ============================================================
// GoogleAuthService - Singleton Auth Service
// ============================================================
const GoogleAuthService = {
    configure: (): void => {
        GoogleSignin.configure({
            webClientId: WEB_CLIENT_ID,
            iosClientId: IOS_CLIENT_ID,
            offlineAccess: false,
            forceCodeForRefreshToken: true,
        });
    },


    signIn: async (referralCode?: string | null): Promise<any> => {
        try {
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            const response = await GoogleSignin.signIn();

            const idToken: string | null =
                (response.data as any)?.idToken || (response as any).idToken;

            if (!idToken) {
                return;
            }

            console.log('[GoogleAuthService] ✅ Google sign-in successful. Token obtained.');

            const apiResponse = await AuthServices.GoogleLogin(idToken, referralCode);

            if (apiResponse && apiResponse.success) {
                return apiResponse;
            }
            return apiResponse;
        } catch (err: any) {
            const errorMessage = err.message || 'An unknown error occurred';

            console.log('[GoogleAuthService] ❌ Error during login:', errorMessage);
            throw new Error(errorMessage);
        }
    },

};

export default GoogleAuthService;