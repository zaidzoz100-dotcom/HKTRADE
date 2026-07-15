import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useApplyReferral, getGetAccountQueryKey } from '@workspace/api-client-react';

const PENDING_REFERRAL_KEY = 'aurum-watch:pendingReferralCode';

/**
 * Mobile equivalent of the web app's lib/referral.ts + referral-redeemer.tsx.
 * There's no URL bar on mobile, so a referral code arrives either via a
 * deep link (aurum-watch-mobile://?ref=CODE, or a universal link routed
 * into the app) captured here, or via manual entry on the Account tab
 * (see useApplyReferral usage there). Both paths converge on the same
 * "redeem once" rule enforced by the backend.
 */
function extractRefCode(url: string | null): string | null {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    const ref = queryParams?.ref;
    if (typeof ref === 'string' && ref.trim()) return ref.trim().toUpperCase();
  } catch {
    // ignore malformed URLs
  }
  return null;
}

export function useReferralDeepLink(referredByCode: string | null | undefined) {
  const queryClient = useQueryClient();
  const applyReferral = useApplyReferral();
  const attempted = useRef(false);

  // Capture any incoming deep link (cold start or while running) into storage.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const code = extractRefCode(url);
      if (code) AsyncStorage.setItem(PENDING_REFERRAL_KEY, code);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const code = extractRefCode(url);
      if (code) AsyncStorage.setItem(PENDING_REFERRAL_KEY, code);
    });
    return () => subscription.remove();
  }, []);

  // Once the account is loaded and hasn't redeemed a code yet, apply any
  // pending code captured above.
  useEffect(() => {
    if (attempted.current) return;
    if (referredByCode === undefined) return;
    if (referredByCode) return;

    (async () => {
      const code = await AsyncStorage.getItem(PENDING_REFERRAL_KEY);
      if (!code) return;
      attempted.current = true;
      try {
        await applyReferral.mutateAsync({ data: { code } });
        queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
      } catch {
        // invalid/self/already-applied — nothing actionable here
      } finally {
        await AsyncStorage.removeItem(PENDING_REFERRAL_KEY);
      }
    })();
  }, [referredByCode, applyReferral, queryClient]);
}
