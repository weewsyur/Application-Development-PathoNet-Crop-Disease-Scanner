import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { COLORS, SIZES } from '@/constants/theme';

interface LoadingFallbackProps {
  message?: string;
}

export default function LoadingFallback({ message = "Loading..." }: LoadingFallbackProps) {
  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      padding: SIZES.lg,
    }}>
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary} 
        style={{ marginBottom: SIZES.md }}
      />
      <Text style={{
        fontSize: SIZES.font,
        color: COLORS.textMid,
        textAlign: 'center',
      }}>
        {message}
      </Text>
    </View>
  );
}
