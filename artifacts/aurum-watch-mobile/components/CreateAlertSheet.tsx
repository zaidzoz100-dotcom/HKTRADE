import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useCreateAlert,
  useGetAssets,
  getGetAssetsQueryKey,
  getListAlertsQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const FALLBACK_ASSETS = [
  { symbol: 'XAU', label: 'Gold (XAU)' },
  { symbol: 'XAG', label: 'Silver (XAG)' },
  { symbol: 'EUR/USD', label: 'EUR/USD' },
  { symbol: 'GBP/USD', label: 'GBP/USD' },
  { symbol: 'USD/JPY', label: 'USD/JPY' },
];

/**
 * Bottom-sheet form for creating a price alert, mirroring the web app's
 * create-alert-dialog.tsx. `presetAssetSymbol` pre-selects an asset when
 * opened from a tapped market card.
 */
export function CreateAlertSheet({
  visible,
  onClose,
  presetAssetSymbol,
  onBlocked,
}: {
  visible: boolean;
  onClose: () => void;
  presetAssetSymbol?: string;
  /** Called instead of opening, when the account can't create alerts. */
  onBlocked?: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const createAlert = useCreateAlert();
  const { data: assetCatalog } = useGetAssets({
    query: { queryKey: getGetAssetsQueryKey() },
  });
  const ASSETS = assetCatalog?.length
    ? assetCatalog.map((a) => ({ symbol: a.symbol, label: `${a.name} (${a.symbol})` }))
    : FALLBACK_ASSETS;

  const [assetSymbol, setAssetSymbol] = useState(presetAssetSymbol ?? ASSETS[0]?.symbol ?? 'XAU');
  const [targetPrice, setTargetPrice] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible && presetAssetSymbol) setAssetSymbol(presetAssetSymbol);
  }, [visible, presetAssetSymbol]);

  const styles = createStyles(colors);
  const priceValue = Number(targetPrice);
  const canSubmit = assetSymbol && targetPrice.length > 0 && priceValue > 0;

  function handleSubmit() {
    const asset = ASSETS.find((a) => a.symbol === assetSymbol);
    if (!asset || !canSubmit) return;

    createAlert.mutate(
      {
        data: {
          assetSymbol,
          assetLabel: asset.label,
          targetPrice: priceValue,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
          setTargetPrice('');
          setNote('');
          onClose();
        },
        onError: (error: any) => {
          if (error?.response?.status === 403) {
            onClose();
            onBlocked?.();
          }
        },
      },
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="notifications" size={18} color={colors.primary} />
              <Text style={styles.headerTitle}>Set Price Target</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Text style={styles.label}>Asset</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.assetRow}
          >
            {ASSETS.map((asset) => {
              const selected = asset.symbol === assetSymbol;
              return (
                <Pressable
                  key={asset.symbol}
                  onPress={() => setAssetSymbol(asset.symbol)}
                  style={[styles.assetChip, selected && styles.assetChipSelected]}
                >
                  <Text style={[styles.assetChipText, selected && styles.assetChipTextSelected]}>
                    {asset.symbol}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Target Price</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceSign}>$</Text>
            <TextInput
              style={styles.priceInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              value={targetPrice}
              onChangeText={setTargetPrice}
              testID="alert-target-price"
            />
          </View>
          <Text style={styles.hint}>
            You'll be alerted the moment the price reaches this level, rising or falling.
          </Text>

          <Text style={styles.label}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sell half position"
            placeholderTextColor={colors.mutedForeground}
            value={note}
            onChangeText={setNote}
          />

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (!canSubmit || createAlert.isPending) && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || createAlert.isPending}
            testID="alert-submit"
          >
            {createAlert.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.submitButtonText}>Arm Alert</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
      marginBottom: 8,
      marginTop: 14,
    },
    assetRow: { gap: 8, paddingRight: 8 },
    assetChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    assetChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    assetChipText: { color: colors.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
    assetChipTextSelected: { color: colors.primaryForeground },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
    },
    priceSign: { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 18 },
    priceInput: {
      flex: 1,
      paddingVertical: 13,
      paddingLeft: 8,
      fontSize: 18,
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
    },
    hint: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 22,
    },
    submitButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      letterSpacing: 0.5,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
  });
}
