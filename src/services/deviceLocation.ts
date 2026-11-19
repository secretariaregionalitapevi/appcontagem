import { Platform } from 'react-native';
import { DevicePosition } from '../utils/locationSafetyRules';

export type LocationFix = {
  position?: DevicePosition;
  reason?: 'denied' | 'timeout' | 'unavailable' | 'insecure';
};
let cached: { fix: LocationFix; at: number } | undefined;
let pending: Promise<LocationFix> | undefined;
let nativePermissionRequested = false;

export function resetDeviceLocation() {
  cached = undefined;
  nativePermissionRequested = false;
}
export async function getDeviceLocation(force = false): Promise<LocationFix> {
  if (!force && cached && Date.now() - cached.at < (cached.fix.position ? 120000 : 30000))
    return cached.fix;
  if (pending) return pending;
  pending = new Promise<LocationFix>(resolve => {
    let finished = false;
    const finish = (fix: LocationFix) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve(fix);
      }
    };
    // Browser permission dialogs are not included in the platform's own timeout.
    const timer = setTimeout(() => finish({ reason: 'timeout' }), 12000);
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.isSecureContext)
        return finish({ reason: 'insecure' });
      if (!navigator.geolocation) return finish({ reason: 'unavailable' });
      try {
        navigator.geolocation.getCurrentPosition(
          result =>
            finish({
              position: {
                latitude: result.coords.latitude,
                longitude: result.coords.longitude,
                accuracy: result.coords.accuracy,
                timestamp: result.timestamp,
              },
            }),
          error =>
            finish({
              reason: error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable',
            }),
          { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        );
      } catch {
        finish({ reason: 'unavailable' });
      }
    } else {
      void (async () => {
        try {
          const Location = require('expo-location') as typeof import('expo-location');
          const shouldRequest = force || !nativePermissionRequested;
          nativePermissionRequested = true;
          const permission = await (shouldRequest
            ? Location.requestForegroundPermissionsAsync()
            : Location.getForegroundPermissionsAsync());
          if (finished) return;
          if (permission.status !== 'granted') return finish({ reason: 'denied' });
          const result = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          finish({
            position: {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
              accuracy: result.coords.accuracy ?? Infinity,
              timestamp: result.timestamp,
            },
          });
        } catch {
          finish({ reason: 'unavailable' });
        }
      })();
    }
  })
    .then(fix => {
      cached = { fix, at: Date.now() };
      return fix;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}
