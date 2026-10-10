import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface DeviceDetails {
  os: string;
  version: string | number;
  brand: string;
  model: string;
  appVersion: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  deviceDetails: DeviceDetails;
}


export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  let deviceId = 'unknown';

  try {
    if (Platform.OS === 'android') {
      deviceId = (await Application.getAndroidId()) || 'unknown_android';
    } else if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      deviceId = iosId || 'unknown_ios';
    }
  } catch (error) {
    console.error("Error fetching Device ID:", error);
    deviceId = Application.applicationId || 'unknown_device';
  }

  const deviceDetails: DeviceDetails = {
    os: Platform.OS,
    version: Platform.Version,
    brand: Platform.OS === 'ios' ? 'Apple' : 'Android',
    model: Constants.deviceName || 'Unknown Model',
    appVersion: Constants.expoConfig?.version || '1.0.0',
  };

  return {
    deviceId,
    deviceType: Platform.OS,
    deviceDetails,
  };
};