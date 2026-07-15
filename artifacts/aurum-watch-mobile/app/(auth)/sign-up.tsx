import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useSignUp } from '@clerk/expo';
import { Link, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, errors, fetchStatus } = useSignUp();
  const { isSignedIn } = useAuth();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');

  const styles = createStyles(colors);

  if (signUp.status === 'complete' || isSignedIn) return null;

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === 'complete') {
      await signUp.finalize({
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) return;
          router.replace(decorateUrl('/(app)/(tabs)') as Href);
        },
      });
    }
  };

  const awaitingCode =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0;

  if (awaitingCode) {
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
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Ionicons name="mail-open" size={26} color={colors.primary} />
          </View>
          <Text style={styles.brandTitle}>VERIFY YOUR EMAIL</Text>
          <Text style={styles.brandSubtitle}>
            Enter the code we sent to {emailAddress}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={colors.mutedForeground}
            value={code}
            onChangeText={setCode}
            testID="sign-up-code"
          />
          {errors?.fields?.code && (
            <Text style={styles.error}>{errors.fields.code.message}</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              fetchStatus === 'fetching' && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={handleVerify}
            disabled={fetchStatus === 'fetching'}
            testID="sign-up-verify"
          >
            {fetchStatus === 'fetching' ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.primaryButtonText}>Verify</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => signUp.verifications.sendEmailCode()}
          >
            <Text style={styles.secondaryButtonText}>Resend code</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    );
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
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Ionicons name="diamond" size={26} color={colors.primary} />
        </View>
        <Text style={styles.brandTitle}>CREATE ACCOUNT</Text>
        <Text style={styles.brandSubtitle}>Start your 4-day free trial</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          value={emailAddress}
          onChangeText={setEmailAddress}
          testID="sign-up-email"
        />
        {errors?.fields?.emailAddress && (
          <Text style={styles.error}>{errors.fields.emailAddress.message}</Text>
        )}

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            testID="sign-up-password"
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={12}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>
        {errors?.fields?.password && (
          <Text style={styles.error}>{errors.fields.password.message}</Text>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            (!emailAddress || !password || fetchStatus === 'fetching') && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={handleSubmit}
          disabled={!emailAddress || !password || fetchStatus === 'fetching'}
          testID="sign-up-submit"
        >
          {fetchStatus === 'fetching' ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          )}
        </Pressable>

        <View nativeID="clerk-captcha" />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/(auth)/sign-in">
          <Text style={styles.footerLink}>Sign in</Text>
        </Link>
      </View>
    </KeyboardAwareScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    brand: {
      alignItems: 'center',
      marginBottom: 32,
    },
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
      fontSize: 20,
      letterSpacing: 2,
      color: colors.foreground,
    },
    brandSubtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 4,
      textAlign: 'center',
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
    codeInput: {
      textAlign: 'center',
      fontSize: 22,
      letterSpacing: 8,
      fontFamily: 'Inter_700Bold',
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
    },
    eyeButton: { padding: 4 },
    error: {
      color: colors.destructive,
      fontSize: 12,
      marginTop: 6,
      fontFamily: 'Inter_400Regular',
    },
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
    secondaryButton: { alignItems: 'center', marginTop: 14, padding: 6 },
    secondaryButtonText: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 24,
    },
    footerText: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
    },
    footerLink: {
      color: colors.primary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
  });
}
