import React, { useEffect, useRef } from 'react';
import {
  Alert as RNAlert,
  Animated,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import {
  usePushPermissionStatus,
  usePushRegistration,
} from '@/hooks/usePushRegistration';

// Maps each OS permission state to the user-visible copy shown in the card.
const STATUS_CONFIG = {
  granted: {
    label: 'Active',
    sublabel: "You'll be notified when your targets are hit",
    color: 'success' as const,
    icon: 'checkmark-circle' as const,
  },
  undetermined: {
    label: 'Not enabled',
    sublabel: 'Tap the toggle to allow price-alert notifications',
    color: 'mutedForeground' as const,
    icon: 'notifications-off-outline' as const,
  },
  denied: {
    label: 'Blocked',
    sublabel: 'Enable notifications in your device Settings',
    color: 'destructive' as const,
    icon: 'ban' as const,
  },
  unavailable: {
    label: 'Unavailable',
    sublabel: 'Push notifications are not supported on this device',
    color: 'mutedForeground' as const,
    icon: 'notifications-off-outline' as const,
  },
} as const;

/**
 * Notification Control Center card — placed at the top of the home screen so
 * the user's push-notification status is always visible and actionable without
 * navigating to Account settings.
 *
 * Behaviour per permission state:
 *   granted      → toggle shown ON (read-only; disabling requires OS Settings)
 *   undetermined → toggle shown OFF; tapping requests OS permission
 *   denied       → toggle replaced with "Open Settings" action
 *   unavailable  → card shown in a disabled/muted state (web / simulator)
 */
export function NotificationControlCenter() {
  const colors = useColors();
  const styles = createStyles(colors);

  const { status, refresh: refreshStatus, openSettings } = usePushPermissionStatus();
  const { register } = usePushRegistration(false);

  // Pulse animation for the active indicator dot.
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status !== 'granted') {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [status, pulseAnim]);

  const cfg = STATUS_CONFIG[status];
  const statusColor =
    status === 'granted'
      ? colors.success
      : status === 'denied'
        ? colors.destructive
        : colors.mutedForeground;

  async function handleToggle(value: boolean) {
    if (!value) return; // Can't disable without OS Settings; ignore tap-off.
    if (status === 'denied') {
      RNAlert.alert(
        'Notifications blocked',
        'Open your device Settings and enable notifications for Forex Alarm.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ],
      );
      return;
    }
    await register();
    refreshStatus();
  }

  function handleDeniedPress() {
    RNAlert.alert(
      'Notifications blocked',
      'Open your device Settings and enable notifications for Forex Alarm.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => openSettings() },
      ],
    );
  }

  return (
    <View style={styles.card}>
      {/* Header row: bell icon + title/status + toggle */}
      <View style={styles.headerRow}>
        {/* Bell icon with active-glow ring */}
        <View style={styles.iconWrap}>
          <View
            style={[
              styles.iconRing,
              { borderColor: status === 'granted' ? colors.primary : colors.border },
            ]}
          >
            <Ionicons
              name={status === 'granted' ? 'notifications' : 'notifications-off-outline'}
              size={22}
              color={status === 'granted' ? colors.primary : colors.mutedForeground}
            />
          </View>
        </View>

        {/* Title + status label */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Price Alerts</Text>
          <View style={styles.statusRow}>
            {/* Animated pulse dot */}
            <View style={styles.dotContainer}>
              {status === 'granted' && (
                <Animated.View
                  style={[
                    styles.dotPulse,
                    { backgroundColor: statusColor, transform: [{ scale: pulseAnim }] },
                  ]}
                />
              )}
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
            </View>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Right-side control: toggle for granted/undetermined, chevron-to-settings for denied */}
        {status === 'denied' ? (
          <Pressable onPress={handleDeniedPress} style={styles.settingsButton}>
            <Text style={styles.settingsButtonText}>Settings</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>
        ) : (
          <Switch
            value={status === 'granted'}
            onValueChange={handleToggle}
            disabled={status === 'unavailable'}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={status === 'granted' ? colors.primaryForeground : colors.mutedForeground}
            ios_backgroundColor={colors.border}
          />
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Status description row */}
      <View style={styles.descRow}>
        <Ionicons name={cfg.icon} size={13} color={statusColor} />
        <Text style={[styles.descText, { color: statusColor }]}>{cfg.sublabel}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 8,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrap: {},
    iconRing: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: {
      flex: 1,
      gap: 3,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    dotContainer: {
      width: 8,
      height: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      position: 'absolute',
    },
    dotPulse: {
      width: 7,
      height: 7,
      borderRadius: 4,
      opacity: 0.35,
      position: 'absolute',
    },
    statusLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    settingsButtonText: {
      color: colors.primary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: -16,
    },
    descRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    descText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      flex: 1,
    },
  });
}
