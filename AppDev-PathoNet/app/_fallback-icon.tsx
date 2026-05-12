import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface FallbackIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function FallbackIcon({ name, size = 24, color = COLORS.textMid, style }: FallbackIconProps) {
  // Simple fallback icon using text for web
  const getIconSymbol = (iconName: string): string => {
    const iconMap: Record<string, string> = {
      'home': '🏠',
      'scan': '📷',
      'analytics': '📊',
      'history': '📋',
      'profile': '👤',
      'settings': '⚙️',
      'leaf': '🍃',
      'bug': '🐛',
      'sunny': '☀️',
      'partly-sunny': '⛅',
      'moon': '🌙',
      'add': '+',
      'close': '✕',
      'check': '✓',
      'arrow-forward': '→',
      'arrow-back': '←',
      'menu': '☰',
    };
    return iconMap[iconName] || '?';
  };

  const symbol = getIconSymbol(name);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text style={[styles.icon, { fontSize: size * 0.7, color }]}>
        {symbol}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
    lineHeight: 24 * 0.9,
  },
});
