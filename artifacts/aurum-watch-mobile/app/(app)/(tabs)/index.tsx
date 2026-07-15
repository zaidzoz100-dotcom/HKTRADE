import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetAccount, getGetAccountQueryKey } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useLivePrices } from '@/hooks/useLivePrices';
import { CreateAlertSheet } from '@/components/CreateAlertSheet';
import { UpgradeSheet } from '@/components/UpgradeSheet';
import { NotificationControlCenter } from '@/components/NotificationControlCenter';

type PriceAsset = { symbol: string; name: string; price: number; category: 'metal' | 'forex' | 'crypto' };

function formatPrice(asset: PriceAsset): string {
  return asset.category === 'forex' ? asset.price.toFixed(5) : asset.price.toFixed(2);
}

/**
 * Live market grid, mirroring the web app's components/live-prices.tsx.
 * Tapping a card opens the create-alert sheet pre-filled for that asset.
 */
function PriceGrid({
  assets,
  onSelectAsset,
}: {
  assets: PriceAsset[];
  onSelectAsset: (symbol: string) => void;
}) {
  const colors = useColors();
  const styles = createDashboardStyles(colors);

  if (assets.length === 0) {
    return (
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={[styles.card, styles.cardSkeleton]} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {assets.map((asset) => (
        <Pressable
          key={asset.symbol}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => onSelectAsset(asset.symbol)}
        >
          <Text style={styles.cardSymbol}>{asset.symbol}</Text>
          <Text style={styles.cardPrice}>{formatPrice(asset)}</Text>
          <Text style={styles.cardName} numberOfLines={1}>
            {asset.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: account } = useGetAccount({ query: { queryKey: getGetAccountQueryKey() } });
  const { data: prices, refetch, isFetching } = useLivePrices();

  const [alertOpen, setAlertOpen] = useState(false);
  const [presetAsset, setPresetAsset] = useState<string | undefined>(undefined);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const canCreateAlerts = account?.canCreateAlerts ?? true;
  const styles = createDashboardStyles(colors);

  const allAssets: PriceAsset[] = prices
    ? [
        ...prices.metals.map((m) => ({ symbol: m.symbol, name: m.name, price: m.price, category: 'metal' as const })),
        ...prices.forex.map((f) => ({ symbol: f.pair, name: f.pair, price: f.rate, category: 'forex' as const })),
        ...(prices.crypto ?? []).map((c) => ({ symbol: c.symbol, name: c.name, price: c.price, category: 'crypto' as const })),
      ]
    : [];

  const favoriteAssets = account?.favoriteAssets ?? [];
  const visibleAssets = favoriteAssets.length
    ? favoriteAssets
        .map((symbol) => allAssets.find((a) => a.symbol === symbol))
        .filter((a): a is PriceAsset => !!a)
    : allAssets;

  function handleSelectAsset(symbol: string) {
    if (!canCreateAlerts) {
      setUpgradeOpen(true);
      return;
    }
    setPresetAsset(symbol);
    setAlertOpen(true);
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {account && !account.isPremium && (
        <View style={[styles.trialBanner, account.daysRemaining <= 0 && styles.trialBannerUrgent]}>
          <Ionicons
            name="hourglass"
            size={16}
            color={account.daysRemaining <= 0 ? colors.destructive : colors.primary}
          />
          <Text
            style={[
              styles.trialBannerText,
              { color: account.daysRemaining <= 0 ? colors.destructive : colors.primary },
            ]}
          >
            {account.daysRemaining > 0
              ? `FREE TRIAL — ${account.daysRemaining} day${account.daysRemaining === 1 ? '' : 's'} left`
              : 'TRIAL ENDED — ALERTS LOCKED'}
          </Text>
          <Pressable onPress={() => setUpgradeOpen(true)} style={styles.trialBannerAction}>
            <Text style={styles.trialBannerActionText}>Upgrade</Text>
          </Pressable>
        </View>
      )}

      <NotificationControlCenter />

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Live Markets</Text>
        {prices && (
          <View style={styles.updatedRow}>
            {prices.stale && (
              <View style={styles.staleBadge}>
                <Text style={styles.staleBadgeText}>STALE</Text>
              </View>
            )}
            <Text style={styles.updatedText}>
              {new Date(prices.updatedAt).toLocaleTimeString()}
            </Text>
          </View>
        )}
      </View>

      <PriceGrid assets={visibleAssets} onSelectAsset={handleSelectAsset} />

      <Pressable
        style={({ pressed }) => [styles.newAlertButton, pressed && styles.pressed]}
        onPress={() => {
          if (!canCreateAlerts) {
            setUpgradeOpen(true);
            return;
          }
          setPresetAsset(undefined);
          setAlertOpen(true);
        }}
      >
        <Ionicons
          name={canCreateAlerts ? 'add-circle' : 'lock-closed'}
          size={18}
          color={colors.primaryForeground}
        />
        <Text style={styles.newAlertButtonText}>New Alert</Text>
      </Pressable>

      <CreateAlertSheet
        visible={alertOpen}
        onClose={() => setAlertOpen(false)}
        presetAssetSymbol={presetAsset}
        onBlocked={() => setUpgradeOpen(true)}
      />
      <UpgradeSheet visible={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </ScrollView>
  );
}

function createDashboardStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
    trialBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: colors.radius + 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    trialBannerUrgent: { borderColor: colors.destructive },
    trialBannerText: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 12 },
    trialBannerAction: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    trialBannerActionText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 18 },
    updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    updatedText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
    staleBadge: {
      backgroundColor: colors.destructive,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    staleBadgeText: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 9 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: {
      width: '31%',
      aspectRatio: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius + 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: 8,
    },
    cardSkeleton: { opacity: 0.4 },
    cardPressed: { opacity: 0.7 },
    cardSymbol: { color: '#60a5fa', fontFamily: 'Inter_700Bold', fontSize: 11 },
    cardPrice: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 16 },
    cardName: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9 },
    newAlertButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
    },
    newAlertButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
    },
    pressed: { opacity: 0.85 },
  });
}
