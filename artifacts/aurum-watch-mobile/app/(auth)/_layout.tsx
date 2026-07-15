import React from 'react';
import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const colors = useColors();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/(app)/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
