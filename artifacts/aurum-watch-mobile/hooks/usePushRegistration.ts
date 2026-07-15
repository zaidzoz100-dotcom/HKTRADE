import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  useRegisterExpoPushToken,
  useUnregisterExpoPushToken,
} from '@workspace/api-client-react';

// NOTE: setNotificationHandler is intentionally NOT here — it is set once at
// module scope in app/_layout.tsx so it is always registered before any
// screen or notification can arrive, even on a cold start.

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

// See the comment in `register` below: casting to a minimal shape because the
// installed expo-notifications/expo-modules-core type declarations don't
// structurally resolve PermissionResponse's fields in this monorepo's nested
// dependency tree, even though they exist at runtime.
type PermissionsResult = { granted: boolean; canAskAgain: boolean };

async function readPermissionStatus(): Promise<PushPermissionStatus> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unavailable';
  const result = (await Notifications.getPermissionsAsync()) as unknown as PermissionsResult;
  if (result.granted) return 'granted';
  if (!result.canAskAgain) return 'denied';
  return 'undetermined';
}

/**
 * Registers this device for native push notifications (price alert
 * triggers) once the user is signed in, mirroring the web app's browser
 * push subscription flow but for Expo push tokens. Additive to the
 * existing web push system — does not touch it.
 */
export function usePushRegistration(enabled: boolean) {
  const registerToken = useRegisterExpoPushToken();
  const unregisterToken = useUnregisterExpoPushToken();
  const registeredToken = useRef<string | null>(null);

  const register = useCallback(async () => {
    if (Platform.OS === 'web' || !Device.isDevice) return;

    const existing = (await Notifications.getPermissionsAsync()) as unknown as PermissionsResult;
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const requested = (await Notifications.requestPermissionsAsync()) as unknown as PermissionsResult;
      granted = requested.granted;
    }
    if (!granted) return;

    // projectId is required in SDK 50+ — without it getExpoPushTokenAsync
    // fails in production builds or returns a dev-only token that Expo's
    // push service rejects for real devices.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    registeredToken.current = tokenResponse.data;
    registerToken.mutate({ data: { token: tokenResponse.data } });
  }, [registerToken]);

  useEffect(() => {
    if (!enabled) return;
    register();
  }, [enabled, register]);

  const unregister = useCallback(() => {
    if (registeredToken.current) {
      unregisterToken.mutate({ data: { token: registeredToken.current } });
      registeredToken.current = null;
    }
  }, [unregisterToken]);

  return { unregister, register };
}

/**
 * Tracks the OS notification-permission state (granted / denied /
 * undetermined / unavailable on web & simulators) so Settings UI can show
 * the current state and, when denied, guide the user to the OS Settings
 * app to re-enable it. Refreshes automatically when the app regains
 * foreground (e.g. after the user returns from Settings).
 */
export function usePushPermissionStatus() {
  const [status, setStatus] = useState<PushPermissionStatus>('undetermined');

  const refresh = useCallback(async () => {
    setStatus(await readPermissionStatus());
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { status, refresh, openSettings: Linking.openSettings };
}
