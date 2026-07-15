import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertUpdateStatus,
  useListAlerts,
  useUpdateAlert,
  useDeleteAlert,
  getListAlertsQueryKey,
  type Alert,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { CreateAlertSheet } from '@/components/CreateAlertSheet';

function statusMeta(colors: ReturnType<typeof useColors>, status: Alert['status']) {
  switch (status) {
    case 'active':
      return { label: 'ARMED', color: colors.success, icon: 'radio-button-on' as const };
    case 'triggered':
      return { label: 'TRIGGERED', color: colors.destructive, icon: 'alert-circle' as const };
    case 'acknowledged':
      return { label: 'ACKED', color: colors.mutedForeground, icon: 'checkmark-circle' as const };
    case 'disabled':
      return { label: 'OFF', color: colors.mutedForeground, icon: 'power' as const };
    default:
      return { label: status, color: colors.mutedForeground, icon: 'ellipse' as const };
  }
}

function AlertRow({ alert }: { alert: Alert }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const updateAlert = useUpdateAlert();
  const deleteAlert = useDeleteAlert();
  const styles = createStyles(colors);
  const meta = statusMeta(colors, alert.status);
  const isToggleable = alert.status === 'active' || alert.status === 'disabled';

  function handleToggle() {
    const newStatus = alert.status === 'active' ? AlertUpdateStatus.disabled : AlertUpdateStatus.active;
    updateAlert.mutate(
      { id: alert.id, data: { status: newStatus } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() }) },
    );
  }

  function handleDelete() {
    deleteAlert.mutate(
      { id: alert.id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() }) },
    );
  }

  return (
    <View style={[styles.row, alert.status === 'triggered' && styles.rowTriggered]}>
      <View style={styles.rowTop}>
        <View style={styles.statusChip}>
          <Ionicons name={meta.icon} size={12} color={meta.color} />
          <Text style={[styles.statusChipText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <Text style={styles.rowAsset}>{alert.assetSymbol}</Text>
      </View>

      <View style={styles.rowMiddle}>
        <Text
          style={[
            styles.rowDirection,
            { color: alert.direction === 'above' ? colors.success : colors.destructive },
          ]}
        >
          {alert.direction === 'above' ? '↗ ABOVE' : '↘ BELOW'}
        </Text>
        <Text style={styles.rowTarget}>{alert.targetPrice}</Text>
      </View>

      {alert.note && <Text style={styles.rowNote}>{alert.note}</Text>}

      <View style={styles.rowActions}>
        {isToggleable && (
          <View style={styles.rowActionItem}>
            <Text style={styles.rowActionLabel}>Active</Text>
            <Switch
              value={alert.status === 'active'}
              onValueChange={handleToggle}
              disabled={updateAlert.isPending}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        )}
        <Pressable onPress={handleDelete} disabled={deleteAlert.isPending} hitSlop={10}>
          <Ionicons name="trash" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: alerts, isLoading } = useListAlerts();
  const [createOpen, setCreateOpen] = useState(false);
  const styles = createStyles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        {isLoading && <Text style={styles.emptyText}>Loading signals…</Text>}

        {!isLoading && (!alerts || alerts.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={28} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No active tracking signals</Text>
          </View>
        )}

        {alerts?.map((alert) => <AlertRow key={alert.id} alert={alert} />)}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, { bottom: insets.bottom + 20 }, pressed && styles.pressed]}
        onPress={() => setCreateOpen(true)}
      >
        <Ionicons name="add" size={26} color={colors.primaryForeground} />
      </Pressable>

      <CreateAlertSheet visible={createOpen} onClose={() => setCreateOpen(false)} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
    emptyState: { alignItems: 'center', gap: 10, paddingVertical: 60 },
    emptyText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 },
    row: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 8,
      padding: 14,
      gap: 8,
    },
    rowTriggered: { borderColor: colors.destructive },
    rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusChipText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
    rowAsset: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
    rowMiddle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowDirection: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
    rowTarget: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
    rowNote: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
      marginTop: 4,
    },
    rowActionItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowActionLabel: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
    fab: {
      position: 'absolute',
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    pressed: { opacity: 0.85 },
  });
}
