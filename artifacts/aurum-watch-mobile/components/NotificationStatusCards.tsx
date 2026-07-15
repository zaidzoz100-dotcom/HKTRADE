import React, { useEffect, useRef } from 'react';
import {
  Alert as RNAlert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import {
  usePushPermissionStatus,
  usePushRegistration,
} from '@/hooks/usePushRegistration';

// ─── Types ────────────────────────────────────────────────────────────────────

type CardStatus = 'active' | 'inactive' | 'blocked' | 'unavailable';

// ─── Animated status dot ──────────────────────────────────────────────────────

function StatusDot({ active, color }: { active: boolean; color: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 2.2, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulseAnim]);

  return (
    <View style={dotStyles.wrap}>
      {active && (
        <Animated.View
          style={[
            dotStyles.ring,
            { backgroundColor: color, transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <View style={[dotStyles.core, { backgroundColor: color }]} />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  wrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 10, height: 10, borderRadius: 5, opacity: 0.3, position: 'absolute' },
  core: { width: 8, height: 8, borderRadius: 4, position: 'absolute' },
});

// ─── Individual status card ───────────────────────────────────────────────────

interface StatusCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  status: CardStatus;
  statusLabel: string;
  /** Primary action shown as a gold pill when status is not active */
  actionLabel?: string;
  onAction?: () => void;
}

function StatusCard({
  icon,
  title,
  status,
  statusLabel,
  actionLabel,
  onAction,
}: StatusCardProps) {
  const colors = useColors();
  const s = createCardStyles(colors);

  const dotColor =
    status === 'active'
      ? colors.success
      : status === 'blocked'
        ? colors.destructive
        : colors.mutedForeground;

  const isActive = status === 'active';
  const showAction = status !== 'active' && status !== 'unavailable' && actionLabel;

  return (
    <View
      style={[
        s.card,
        isActive && s.cardActive,
        status === 'blocked' && s.cardBlocked,
      ]}
    >
      {/* Icon */}
      <View style={[s.iconCircle, isActive && s.iconCircleActive]}>
        <Ionicons
          name={icon}
          size={20}
          color={isActive ? colors.primary : colors.mutedForeground}
        />
      </View>

      {/* Title */}
      <Text style={s.title}>{title}</Text>

      {/* Status row */}
      <View style={s.statusRow}>
        <StatusDot active={isActive} color={dotColor} />
        <Text style={[s.statusLabel, { color: dotColor }]}>{statusLabel}</Text>
      </View>

      {/* Action button */}
      {showAction ? (
        <Pressable
          style={({ pressed }) => [s.actionButton, pressed && s.actionPressed]}
          onPress={onAction}
        >
          <Text style={s.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : (
        /* Reserve space so both cards stay the same height */
        <View style={s.actionPlaceholder} />
      )}
    </View>
  );
}

function createCardStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 8,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
      alignItems: 'flex-start',
    },
    cardActive: {
      borderColor: colors.success + '55',
    },
    cardBlocked: {
      borderColor: colors.destructive + '44',
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleActive: {
      borderColor: colors.primary + '66',
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      lineHeight: 16,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    statusLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    actionPressed: { opacity: 0.8 },
    actionText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
    },
    actionPlaceholder: {
      height: 27, // matches actionButton height (5+5+17) so cards are equal
    },
  });
}

// ─── Public export ─────────────────────────────────────────────────────────────

/**
 * Two side-by-side status cards shown at the top of the home dashboard:
 *
 *  ┌──────────────────┐  ┌──────────────────┐
 *  │  In-App           │  │  Background Push  │
 *  │  Notifications    │  │                  │
 *  │  ● Active         │  │  ● Active         │
 *  └──────────────────┘  └──────────────────┘
 *
 * In-App    → OS notification permission (can the device show banners).
 * Background Push → Expo push token registered with our server
 *                   (server can wake the device when the app is closed).
 */
export function NotificationStatusCards() {
  const { status, refresh: refreshStatus, openSettings } = usePushPermissionStatus();
  const { register, isRegistered } = usePushRegistration(false);

  // ── Derive card statuses ───────────────────────────────────────────────────

  // In-App: directly tracks OS permission.
  const inAppStatus: CardStatus =
    status === 'granted'
      ? 'active'
      : status === 'denied'
        ? 'blocked'
        : status === 'unavailable'
          ? 'unavailable'
          : 'inactive';

  // Background Push: active only when permission is granted AND token is
  // registered with the server. If permission is denied, we surface that
  // as blocked so the user knows the root cause.
  const pushStatus: CardStatus =
    status === 'granted' && isRegistered
      ? 'active'
      : status === 'denied'
        ? 'blocked'
        : status === 'unavailable'
          ? 'unavailable'
          : 'inactive';

  const inAppLabel =
    inAppStatus === 'active' ? 'Enabled' : inAppStatus === 'blocked' ? 'Blocked' : 'Disabled';

  const pushLabel =
    pushStatus === 'active'
      ? 'Registered'
      : pushStatus === 'blocked'
        ? 'Blocked'
        : 'Not active';

  // ── Shared denied-alert helper ─────────────────────────────────────────────

  function promptSettings() {
    RNAlert.alert(
      'Notifications blocked',
      'Open your device Settings and enable notifications for Forex Alarm, then come back.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => openSettings() },
      ],
    );
  }

  // ── In-App action ──────────────────────────────────────────────────────────

  async function handleInAppAction() {
    if (status === 'denied') {
      promptSettings();
      return;
    }
    // undetermined → request permission
    await register();
    refreshStatus();
  }

  // ── Background Push action ─────────────────────────────────────────────────

  async function handlePushAction() {
    if (status === 'denied') {
      promptSettings();
      return;
    }
    // undetermined → request permission + register token in one step
    await register();
    refreshStatus();
  }

  return (
    <View style={rowStyles.row}>
      <StatusCard
        icon={
          inAppStatus === 'active'
            ? 'notifications'
            : inAppStatus === 'blocked'
              ? 'notifications-off'
              : 'notifications-outline'
        }
        title={'In-App\nNotifications'}
        status={inAppStatus}
        statusLabel={inAppLabel}
        actionLabel={
          inAppStatus === 'inactive'
            ? 'Enable'
            : inAppStatus === 'blocked'
              ? 'Settings →'
              : undefined
        }
        onAction={handleInAppAction}
      />

      <StatusCard
        icon={
          pushStatus === 'active'
            ? 'radio'
            : pushStatus === 'blocked'
              ? 'radio-outline'
              : 'radio-outline'
        }
        title={'Background\nPush'}
        status={pushStatus}
        statusLabel={pushLabel}
        actionLabel={
          pushStatus === 'inactive'
            ? 'Activate'
            : pushStatus === 'blocked'
              ? 'Settings →'
              : undefined
        }
        onAction={handlePushAction}
      />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
