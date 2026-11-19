import { Platform } from 'react-native';
import { DevicePosition, validGeo } from '../utils/locationSafetyRules';

export type LocationFix = {
  position?: DevicePosition;
  reason?: 'denied' | 'timeout' | 'unavailable' | 'insecure';
};
const listeners = new Set<(fix: LocationFix) => void>();
let cached: { fix: LocationFix; at: number } | undefined;
let pending: Promise<LocationFix> | undefined;
let nativePermissionRequested = false;
let generation = 0;
let stopObservation: (() => void) | undefined;

export function subscribeDeviceLocation(listener: (fix: LocationFix) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function stopDeviceLocationWatch() {
  stopObservation?.();
}
export function resetDeviceLocation() {
  generation++;
  stopDeviceLocationWatch();
  cached = undefined;
  pending = undefined;
  nativePermissionRequested = false;
}
export async function getDeviceLocation(force = false): Promise<LocationFix> {
  if (!force && cached && Date.now() - cached.at < (cached.fix.position ? 120000 : 10000))
    return cached.fix;
  if (pending) return pending;
  stopDeviceLocationWatch();
  const version = generation;
  let resolveResult!: (fix: LocationFix) => void;
  const result = new Promise<LocationFix>(resolve => {
    resolveResult = resolve;
  });
  let settled = false,
    stopped = false,
    best: DevicePosition | undefined;
  let watchId: number | undefined;
  let coarseTimer: ReturnType<typeof setTimeout> | undefined;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout>;
  let observationDeadline: ReturnType<typeof setTimeout>;
  const clearObservation = () => {
    if (watchId === undefined) return;
    try {
      if (typeof navigator.geolocation.clearWatch === 'function')
        navigator.geolocation.clearWatch(watchId);
    } catch {
      /* An optional native browser bridge must not abort the primary read. */
    }
    watchId = undefined;
  };
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    clearTimeout(deadline);
    clearTimeout(observationDeadline);
    clearTimeout(coarseTimer);
    clearTimeout(fallbackTimer);
    clearObservation();
    if (stopObservation === cleanup) stopObservation = undefined;
    if (!settled) settle(best ? { position: best } : { reason: 'unavailable' });
  };
  const settle = (fix: LocationFix) => {
    if (settled) return;
    settled = true;
    if (version === generation) cached = { fix, at: Date.now() };
    resolveResult(fix);
    if (!force || Platform.OS !== 'web') cleanup();
  };
  stopObservation = cleanup;
  // The panel can receive a late answer after a slow permission dialog.
  // Observation is temporary, only for an explicit check, never continuous tracking.
  deadline = setTimeout(() => settle(best ? { position: best } : { reason: 'timeout' }), 15000);
  observationDeadline = setTimeout(cleanup, force ? 45000 : 15000);
  const accept = (position: DevicePosition) => {
    if (
      stopped ||
      version !== generation ||
      !validGeo(position) ||
      !Number.isFinite(position.accuracy) ||
      position.accuracy < 0 ||
      !Number.isFinite(position.timestamp) ||
      Date.now() - position.timestamp > 120000 ||
      position.timestamp > Date.now() + 10000
    )
      return;
    if (best && best.accuracy <= position.accuracy) return;
    best = position;
    const fix = { position };
    cached = { fix, at: Date.now() };
    listeners.forEach(listener => listener(fix));
    if (position.accuracy <= 1000) {
      settle(fix);
      cleanup();
    } else if (!coarseTimer) coarseTimer = setTimeout(() => settle({ position: best! }), 1500);
  };
  const failed = (code?: number) => {
    if (stopped || version !== generation) return;
    if (code === 1) {
      settle(best ? { position: best } : { reason: 'denied' });
      cleanup();
    }
    // Timeout/unavailable in one provider is not failure of another pending provider.
  };
  if (Platform.OS === 'web') {
    const secureContext =
      typeof window !== 'undefined' &&
      (typeof window.isSecureContext === 'boolean'
        ? window.isSecureContext
        : window.location &&
          (window.location.protocol === 'https:' ||
            ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname)));
    if (!secureContext) {
      settle({ reason: 'insecure' });
      cleanup();
    } else if (!navigator.geolocation) {
      settle({ reason: 'unavailable' });
      cleanup();
    } else {
      const success = (value: GeolocationPosition) =>
        accept({
          latitude: value.coords.latitude,
          longitude: value.coords.longitude,
          accuracy: value.coords.accuracy,
          timestamp: value.timestamp,
        });
      let coarseStarted = false,
        coarseAvailable = false;
      const coarse = () => {
        if (stopped || coarseStarted || (best && best.accuracy <= 1000)) return;
        coarseStarted = true;
        coarseAvailable = readSingle(false);
      };
      const readSingle = (highAccuracy: boolean): boolean => {
        try {
          navigator.geolocation.getCurrentPosition(
            success,
            error => {
              failed(error.code);
              if (highAccuracy && error.code !== 1) coarse();
            },
            {
              enableHighAccuracy: highAccuracy,
              maximumAge: highAccuracy ? (force ? 0 : 30000) : 60000,
              timeout: highAccuracy ? 20000 : 12000,
            }
          );
          return true;
        } catch {
          return false;
        }
      };
      // Always start the widely supported one-shot API directly from the user's action.
      const singleAvailable = readSingle(true);
      if (
        force &&
        !stopped &&
        typeof navigator.geolocation.watchPosition === 'function' &&
        typeof navigator.geolocation.clearWatch === 'function'
      ) {
        let watchDenied = false;
        try {
          watchId = navigator.geolocation.watchPosition(
            success,
            error => {
              // Some browser bridges reject observation while allowing one-shot reads.
              if (error.code === 1) {
                watchDenied = true;
                clearObservation();
              } else coarse();
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
          );
          if (stopped || watchDenied) clearObservation();
        } catch {
          // Safari/Mi Browser observation failure cannot cancel the primary provider.
        }
      }
      if (!stopped) {
        if (!singleAvailable) {
          coarse();
          if (!coarseAvailable && watchId === undefined) {
            settle({ reason: 'unavailable' });
            cleanup();
          }
        } else fallbackTimer = setTimeout(coarse, 4000);
      }
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
        if (stopped || version !== generation) return;
        if (permission.status !== 'granted') {
          failed(1);
          return;
        }
        const value = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        accept({
          latitude: value.coords.latitude,
          longitude: value.coords.longitude,
          accuracy: value.coords.accuracy ?? Infinity,
          timestamp: value.timestamp,
        });
      } catch {
        settle({ reason: 'unavailable' });
        cleanup();
      }
    })();
  }
  const operation = result.finally(() => {
    if (pending === operation) pending = undefined;
  });
  pending = operation;
  return operation;
}
