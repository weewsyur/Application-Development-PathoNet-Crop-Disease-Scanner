import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '@/constants/theme';

interface LoadingFallbackProps {
  message?: string;
}

export default function LoadingFallback({ message = "Loading..." }: LoadingFallbackProps) {
  return (
    <View style={styles.container}>
      <View style={styles.loadingContent}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
        <Text style={styles.message}>{message}</Text>
      </View>
      <View style={styles.branding}>
        <Text style={styles.brandText}>PathoNet</Text>
        <Text style={styles.brandSubtext}>AI Crop Disease Scanner</Text>
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.lg,
  },
  loadingContent: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  message: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    textAlign: 'center',
    marginTop: SIZES.md,
  },
  branding: {
    alignItems: 'center',
  },
  brandText: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  brandSubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
  },
} as const;
