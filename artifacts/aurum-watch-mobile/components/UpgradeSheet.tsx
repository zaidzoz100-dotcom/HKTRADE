import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * Subscription-required prompt shown when the trial has ended and the user
 * tries to create an alert, or from the trial banner's "Upgrade" tap.
 * Mirrors the web app's SubscriptionRequiredDialog / PricingDialog — actual
 * checkout/payment collection happens by contacting the admin, matching the
 * web app's model (no in-app purchase flow exists on either platform).
 */
export function UpgradeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={22} color={colors.primary} />
          </View>
          <Text style={styles.title}>Subscription Required</Text>
          <Text style={styles.body}>
            Your 4-day free trial has ended. Upgrade to Premium for unlimited, lifetime access to
            price alerts.
          </Text>

          <View style={styles.plans}>
            <View style={styles.plan}>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>$9/mo</Text>
            </View>
            <View style={[styles.plan, styles.planHighlighted]}>
              <Text style={[styles.planName, styles.planNameHighlighted]}>Yearly</Text>
              <Text style={[styles.planPrice, styles.planPriceHighlighted]}>$79/yr</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => Linking.openURL('mailto:admin@aurumwatch.app?subject=Upgrade%20request')}
          >
            <Ionicons name="chatbubble" size={16} color={colors.primaryForeground} />
            <Text style={styles.primaryButtonText}>Contact Admin to Upgrade</Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: 'center',
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      marginBottom: 8,
    },
    body: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    plans: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 20 },
    plan: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 6,
      paddingVertical: 16,
      alignItems: 'center',
    },
    planHighlighted: { borderColor: colors.primary, backgroundColor: colors.background },
    planName: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
    planNameHighlighted: { color: colors.primary },
    planPrice: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      marginTop: 6,
    },
    planPriceHighlighted: { color: colors.foreground },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      width: '100%',
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
    },
    pressed: { opacity: 0.85 },
    closeButton: { marginTop: 14, padding: 6 },
    closeButtonText: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
  });
}
