import { Platform } from 'react-native';

/**
 * Standard OpenStreetMap (OSM) Tile URL Template
 */
export const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Returns the Mapbox styleURL for iOS, or undefined for Android when using OSM raster tiles.
 */
export const getPlatformStyleURL = (iosStyleUrl: string): string | undefined => {
  if (Platform.OS === 'android') {
    return undefined;
  }
  return iosStyleUrl;
};

/**
 * Helper to check if OSM raster tiles should be rendered (Android only)
 */
export const isOSMTileRequired = (): boolean => {
  return Platform.OS === 'android';
};
