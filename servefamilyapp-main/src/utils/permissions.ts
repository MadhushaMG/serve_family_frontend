import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { NotificationService } from '../Services/NotificationServices';
import { getDeviceInfo } from './deviceUtils';

const PENDING_FCM_TOKEN_KEY = "pendingFcmToken";
const LAST_SAVED_FCM_TOKEN_KEY = "lastSavedFcmToken";


export const saveFCMTokenToAPI = async (token: string): Promise<boolean> => {
  const { isAuthenticated, accessToken } = useAuthStore.getState();

  if (!isAuthenticated || !accessToken) {
    await AsyncStorage.setItem(PENDING_FCM_TOKEN_KEY, token);
    return false;
  }

  try {
    const cachedToken = await AsyncStorage.getItem(LAST_SAVED_FCM_TOKEN_KEY);
    if (cachedToken === token) return true;

    const { deviceId, deviceType, deviceDetails } = await getDeviceInfo();

    await NotificationService.storeFirebaseToken(
      token,
      deviceId,
      deviceType,
      deviceDetails as any
    );

    await AsyncStorage.setItem(LAST_SAVED_FCM_TOKEN_KEY, token);
    await AsyncStorage.removeItem(PENDING_FCM_TOKEN_KEY);
    return true;
  } catch (error) {
    console.error("FCM Token API Save Error:", error);
    return false;
  }
};


export const flushPendingFcmToken = async () => {
  const pendingToken = await AsyncStorage.getItem(PENDING_FCM_TOKEN_KEY);
  if (pendingToken) {
    await saveFCMTokenToAPI(pendingToken);
  }
};


export const setupFcmListener = () => {
  return messaging().onTokenRefresh(token => {
    saveFCMTokenToAPI(token);
  });
};


export const requestNotificationPermissions = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) return false;
    }

    const authStatus = await messaging().requestPermission();
    const enabled = 
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      const token = await messaging().getToken();
      if (token) {
        await saveFCMTokenToAPI(token);
        return true;
      }
    }
  } catch (error) {
    console.error("Permission Request Error:", error);
  }
  return false;
};