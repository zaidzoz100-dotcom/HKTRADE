import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert as RNAlert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAuth, useUser } from '@clerk/expo';
import {
  useGetAccount,
  getGetAccountQueryKey,
  useApplyReferral,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { UpgradeSheet } from '@/components/UpgradeSheet';
import { usePushPermissionStatus, usePushRegistration } from '@/hooks/usePushRegistration';

const PUSH_STATUS_LABEL: Record<string, string> = {
  granted: 'Enabled',
  denied: 'Denied',
  undetermined: 'Not enabled',
  unavailable: 'Unavailable on this device',
};

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { data: account } = useGetAccount({ query: { queryKey: getGetAccountQueryKey() } });
  const applyReferral = useApplyReferral();
  const { status: pushStatus, refresh: refreshPushStatus, openSettings } = usePushPermissionStatus();
  const { register: registerPush } = usePushRegistration(false);

  const [referralInput, setReferralInput] = useState('');
  const [referralError, setReferralError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const styles = createStyles(colors);

  // If the user grants notification permission from the OS Settings app
  // (after tapping "Denied" below) rather than from the in-app prompt, make
  // sure the device still gets registered for push once we detect the
  // permission change on foreground.
  React.useEffect(() => {
    if (pushStatus === 'granted') {
      registerPush();
    }
  }, [pushStatus, registerPush]);

  async function handlePushRowPress() {
    if (pushStatus === 'denied') {
      RNAlert.alert(
        'Notifications disabled',
        'Enable notifications in Settings to receive price alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ],
      );
      return;
    }
    if (pushStatus === 'undetermined') {
      await registerPush();
      refreshPushStatus();
    }
  }

  async function handleCopyCode() {
    if (!account?.referralCode) return;
    await Clipboard.setStringAsync(account.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleShareCode() {
    if (!account?.referralCode) return;
    await Share.share({
      message: `Join me on Forex Alarm and get bonus trial days — use my referral code ${account.referralCode}.`,
    });
  }

  async function handleRedeem() {
    setReferralError(null);
    const code = referralInput.trim().toUpperCase();
    if (!code) return;
    try {
      await applyReferral.mutateAsync({ data: { code } });
      queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
      setReferralInput('');
    } catch {
      setReferralError('Invalid code, self-referral, or already redeemed.');
    }
  }

  function handleSignOut() {
    RNAlert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>
        <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        {account ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Plan</Text>
              <Text style={styles.statValue}>
                {account.isPremium ? account.plan.toUpperCase() : 'FREE TRIAL'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Status</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: account.planStatus === 'active' ? colors.success : colors.destructive },
                ]}
              >
                {account.planStatus.toUpperCase()}
              </Text>
            </View>
            {!account.isPremium && (
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Days remaining</Text>
                <Text style={styles.statValue}>{account.daysRemaining}</Text>
              </View>
            )}
            {!account.isPremium && (
              <Pressable
                style={({ pressed }) => [styles.upgradeButton, pressed && styles.pressed]}
                onPress={() => setUpgradeOpen(true)}
              >
                <Ionicons name="arrow-up-circle" size={16} color={colors.primaryForeground} />
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </Pressable>
            )}
          </>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notifications</Text>
        <Pressable
          style={({ pressed }) => [
            styles.statRow,
            pushStatus !== 'granted' && pushStatus !== 'unavailable' && pressed && styles.pressed,
          ]}
          onPress={handlePushRowPress}
          disabled={pushStatus === 'granted' || pushStatus === 'unavailable'}
        >
          <Text style={styles.statLabel}>Push alerts</Text>
          <View style={styles.pushStatusValue}>
            <Text
              style={[
                styles.statValue,
                {
                  color:
                    pushStatus === 'granted'
                      ? colors.success
                      : pushStatus === 'denied'
                        ? colors.destructive
                        : colors.mutedForeground,
                },
              ]}
            >
              {PUSH_STATUS_LABEL[pushStatus]}
            </Text>
            {(pushStatus === 'denied' || pushStatus === 'undetermined') && (
              <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
            )}
          </View>
        </Pressable>
        {pushStatus === 'denied' && (
          <Text style={styles.cardSubtitle}>
            Tap above to open Settings and re-enable notifications.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your referral code</Text>
        <Text style={styles.cardSubtitle}>
          Earn {account?.referralBonusDays ?? 4} bonus trial days for every friend who joins and
          verifies their account.
        </Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeValue}>{account?.referralCode ?? '——'}</Text>
          <Pressable onPress={handleCopyCode} hitSlop={10} style={styles.codeAction}>
            <Ionicons
              name={copied ? 'checkmark' : 'copy'}
              size={18}
              color={copied ? colors.success : colors.mutedForeground}
            />
          </Pressable>
          <Pressable onPress={handleShareCode} hitSlop={10} style={styles.codeAction}>
            <Ionicons name="share-social" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {!account?.referredByCode && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Have a referral code?</Text>
          <View style={styles.redeemRow}>
            <TextInput
              style={styles.redeemInput}
              autoCapitalize="characters"
              placeholder="Enter code"
              placeholderTextColor={colors.mutedForeground}
              value={referralInput}
              onChangeText={setReferralInput}
            />
            <Pressable
              style={({ pressed }) => [
                styles.redeemButton,
                (!referralInput || applyReferral.isPending) && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={handleRedeem}
              disabled={!referralInput || applyReferral.isPending}
            >
              {applyReferral.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={styles.redeemButtonText}>Apply</Text>
              )}
            </Pressable>
          </View>
          {referralError && <Text style={styles.error}>{referralError}</Text>}
        </View>
      )}

      <Pressable style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]} onPress={handleSignOut}>
        <Ionicons name="log-out" size={18} color={colors.destructive} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <UpgradeSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    email: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 8,
      padding: 16,
      gap: 10,
    },
    cardTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
    cardSubtitle: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statLabel: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 },
    statValue: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
    pushStatusValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 12,
      marginTop: 4,
    },
    upgradeButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },
    codeValue: {
      flex: 1,
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
      letterSpacing: 2,
    },
    codeAction: { padding: 4 },
    redeemRow: { flexDirection: 'row', gap: 8 },
    redeemInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      letterSpacing: 1,
    },
    redeemButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    redeemButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    error: { color: colors.destructive, fontFamily: 'Inter_400Regular', fontSize: 12 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.destructive,
      borderRadius: colors.radius,
      paddingVertical: 13,
      marginTop: 8,
    },
    signOutText: { color: colors.destructive, fontFamily: 'Inter_700Bold', fontSize: 14 },
  });
}
