/**
 * Device Detection Utilities
 * Detects user's device type (iOS/Android) for app store links
 */

export type DeviceType = 'ios' | 'android' | 'other';

/**
 * Detects the user's device type based on user agent
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'other';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Check for iOS devices
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  // Check for Android devices
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  // Check for macOS (might want App Store link)
  if (/macintosh|mac os x/.test(userAgent)) {
    return 'ios';
  }
  
  return 'other';
}

/**
 * Gets the appropriate app store name based on device
 */
export function getAppStoreName(deviceType?: DeviceType): string {
  const device = deviceType || detectDeviceType();
  
  switch (device) {
    case 'ios':
      return 'App Store';
    case 'android':
      return 'Play Store';
    default:
      return 'App Store';
  }
}

/**
 * Checks if the current device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.navigator) {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|mobile/.test(userAgent);
}
