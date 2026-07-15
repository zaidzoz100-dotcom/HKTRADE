import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useGetAccount, getGetAccountQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { usePushRegistration } from '@/hooks/usePushRegistration';
import { useReferralDeepLink } from '@/hooks/useReferralDeepLink';
import { CompleteProfileScreen } from '@/components/CompleteProfileScreen';

/**
 * Auth gate for the whole authenticated app: redirects signed-out users to
 * sign-in, fetches the account (JIT-provisioned on first call), registers
 * this device for native push notifications, captures/redeems any pending
 * referral code, and forces the mandatory profile-completion screen before
 * the tab navigator is reachable. Mirrors the web app's
 * AuthenticatedTracker/HomeRedirect gating.
 */
export default function AppLayout() {
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const colors = useColors();
  const {
    data: account,
    isLoading,
    isError,
    refetch,
  } = useGetAccount({
    query: { queryKey: getGetAccountQueryKey(), enabled: !!isSignedIn, retry: 2 },
  });

  usePushRegistration(!!isSignedIn && !!account?.profileComplete);
  useReferralDeepLink(account?.referredByCode);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Distinguish a genuine failure (bad/expired session, network/server error)
  // from the brief in-flight loading state — otherwise a 401/500 leaves the
  // user stuck on a spinner forever with no way out.
  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 15, textAlign: 'center' }}>
          Couldn't load your account
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' }}>
          Check your connection and try again.
        </Text>
        <Pressable
          onPress={() => refetch()}
          style={{ backgroundColor: colors.primary, borderRadius: colors.radius, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 14 }}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => signOut()}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !account) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!account.profileComplete) {
    return <CompleteProfileScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
