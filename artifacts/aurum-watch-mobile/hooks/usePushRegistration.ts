import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  useRegisterExpoPushToken,
  useUnregisterExpoPushToken,
} from '@workspace/api-client-react';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

    // Cast to a minimal shape: the installed expo-notifications/expo-modules-core
    // type declarations don't structurally resolve PermissionResponse's
    // `granted`/`canAskAgain` fields in this monorepo's nested dependency
    // tree, even though they exist at runtime.
    const existing = (await Notifications.getPermissionsAsync()) as unknown as {
      granted: boolean;
      canAskAgain: boolean;
    };
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const requested = (await Notifications.requestPermissionsAsync()) as unknown as {
        granted: boolean;
      };
      granted = requested.granted;
    }
    if (!granted) return;

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
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

  return { unregister };
}
