import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  useCompleteProfile,
  getGetAccountQueryKey,
} from '@workspace/api-client-react';
import { COUNTRIES, findCountry, isValidPhoneForCountry, type Country } from '@workspace/api-zod';
import { useColors } from '@/hooks/useColors';

function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function CountryPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (country: Country) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const styles = createModalStyles(colors);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Country</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search countries"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          scrollEnabled={filtered.length > 0}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowDial}>{item.dialCode}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

/**
 * Mandatory one-time step shown after sign-up/sign-in, before the dashboard
 * is reachable, when the account hasn't recorded a country + phone number
 * yet. Mirrors the web app's pages/complete-profile.tsx.
 */
export function CompleteProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const completeProfile = useCompleteProfile();
  const [countryCode, setCountryCode] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const country = useMemo(
    () => (countryCode ? findCountry(countryCode) : undefined),
    [countryCode],
  );

  const styles = createStyles(colors);

  async function handleSubmit() {
    setError(null);
    if (!country) {
      setError('Please select your country');
      return;
    }
    const digits = localNumber.replace(/\D/g, '');
    const phoneNumber = `${country.dialCode}${digits}`;
    if (!isValidPhoneForCountry(country.code, phoneNumber)) {
      setError('Enter a valid phone number for the selected country');
      return;
    }
    try {
      await completeProfile.mutateAsync({ data: { country: country.code, phoneNumber } });
      queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey() });
    } catch {
      setError('Something went wrong saving your profile. Please try again.');
    }
  }

  return (
    <KeyboardAwareScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
      ]}
      bottomOffset={40}
      keyboardShouldPersistTaps="handled"
    >
      <CountryPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => setCountryCode(c.code)}
      />

      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
        </View>
        <Text style={styles.brandTitle}>COMPLETE YOUR PROFILE</Text>
        <Text style={styles.brandSubtitle}>
          One last step before your dashboard — this keeps the referral program fair.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Country</Text>
        <Pressable
          style={styles.selectInput}
          onPress={() => setPickerOpen(true)}
          testID="country-select"
        >
          {country ? (
            <Text style={styles.selectValue}>
              {flagEmoji(country.code)} {country.name} ({country.dialCode})
            </Text>
          ) : (
            <Text style={styles.selectPlaceholder}>Select your country</Text>
          )}
          <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Text style={styles.label}>Phone number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.dialCode}>
            <Text style={styles.dialCodeText}>{country?.dialCode ?? '+--'}</Text>
          </View>
          <TextInput
            style={styles.phoneInput}
            keyboardType="number-pad"
            placeholder="5551234567"
            placeholderTextColor={colors.mutedForeground}
            value={localNumber}
            onChangeText={(text) => setLocalNumber(text.replace(/[^\d]/g, ''))}
            testID="phone-input"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            completeProfile.isPending && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSubmit}
          disabled={completeProfile.isPending}
          testID="complete-profile-submit"
        >
          {completeProfile.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footerRow}>
        <Ionicons name="lock-closed" size={12} color={colors.mutedForeground} />
        <Text style={styles.footerText}>Used only for account verification — never shared.</Text>
      </View>
    </KeyboardAwareScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
    brand: { alignItems: 'center', marginBottom: 28 },
    brandMark: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    brandTitle: {
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      letterSpacing: 1,
      color: colors.foreground,
      textAlign: 'center',
    },
    brandSubtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius + 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
    },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
      marginBottom: 6,
      marginTop: 14,
    },
    selectInput: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    selectValue: { color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 15 },
    selectPlaceholder: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
    },
    phoneRow: { flexDirection: 'row', gap: 8 },
    dialCode: {
      minWidth: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 10,
    },
    dialCodeText: { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
    phoneInput: {
      flex: 1,
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
    error: { color: colors.destructive, fontSize: 12, marginTop: 10, fontFamily: 'Inter_400Regular' },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 22,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      letterSpacing: 0.5,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 20,
    },
    footerText: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 },
  });
}

function createModalStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: { color: colors.foreground, fontFamily: 'Inter_700Bold', fontSize: 18 },
    search: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowPressed: { opacity: 0.6 },
    flag: { fontSize: 20 },
    rowName: { flex: 1, color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 15 },
    rowDial: { color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 },
  });
}
