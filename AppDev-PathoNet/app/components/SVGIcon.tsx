import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/theme';

interface SVGIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const iconMap: { [key: string]: { symbol: string; width: number } } = {
  // Navigation icons
  'chevron-back': { symbol: '←', width: 1.2 },
  'chevron-forward': { symbol: '→', width: 1.2 },
  'home': { symbol: '🏠', width: 1.0 },
  'scan': { symbol: '📷', width: 1.0 },
  'analytics': { symbol: '📊', width: 1.0 },
  'history': { symbol: '📋', width: 1.0 },
  'person': { symbol: '👤', width: 1.0 },
  'person-outline': { symbol: '○', width: 1.0 },
  'log-out': { symbol: '⬆', width: 1.0 },
  'log-out-outline': { symbol: '↗', width: 1.2 },
  'add': { symbol: '+', width: 1.0 },
  'add-circle': { symbol: '+', width: 1.0 },
  'remove': { symbol: '-', width: 1.0 },
  'checkmark': { symbol: '✓', width: 1.0 },
  'close': { symbol: '×', width: 1.0 },
  'information': { symbol: 'ℹ', width: 1.0 },
  'information-outline': { symbol: '○', width: 1.0 },
  'settings': { symbol: '⚙', width: 1.0 },
  'camera': { symbol: '📷', width: 1.0 },
  'image': { symbol: '🖼', width: 1.0 },
  'leaf': { symbol: '🍃', width: 1.0 },
  'warning': { symbol: '⚠', width: 1.0 },
  'error': { symbol: '✕', width: 1.0 },
  'success': { symbol: '✓', width: 1.0 },
  'search': { symbol: '🔍', width: 1.0 },
  'filter': { symbol: '⚡', width: 1.0 },
  'download': { symbol: '⬇', width: 1.0 },
  'upload': { symbol: '⬆', width: 1.0 },
  'refresh': { symbol: '↻', width: 1.0 },
  'trash': { symbol: '🗑', width: 1.0 },
  'edit': { symbol: '✏', width: 1.0 },
  'share': { symbol: '⤴', width: 1.0 },
  'heart': { symbol: '♥', width: 1.0 },
  'heart-outline': { symbol: '♡', width: 1.0 },
  'star': { symbol: '★', width: 1.0 },
  'star-outline': { symbol: '☆', width: 1.0 },
  'menu': { symbol: '☰', width: 1.2 },
  'notifications': { symbol: '🔔', width: 1.0 },
  'notifications-outline': { symbol: '○', width: 1.0 },
  'lock': { symbol: '🔒', width: 1.0 },
  'lock-closed': { symbol: '🔒', width: 1.0 },
  'lock-open': { symbol: '🔓', width: 1.0 },
  'eye': { symbol: '👁', width: 1.0 },
  'eye-off': { symbol: '👁‍🗨', width: 1.0 },
  'time': { symbol: '⏰', width: 1.0 },
  'calendar': { symbol: '📅', width: 1.0 },
  'location': { symbol: '📍', width: 1.0 },
  'phone': { symbol: '📞', width: 1.0 },
  'email': { symbol: '✉', width: 1.0 },
  'globe': { symbol: '🌐', width: 1.0 },
  'wifi': { symbol: '📶', width: 1.0 },
  'bluetooth': { symbol: '📡', width: 1.0 },
  'battery': { symbol: '🔋', width: 1.0 },
  'volume': { symbol: '🔊', width: 1.0 },
  'volume-mute': { symbol: '🔇', width: 1.0 },
  'play': { symbol: '▶', width: 1.0 },
  'pause': { symbol: '⏸', width: 1.0 },
  'stop': { symbol: '⏹', width: 1.0 },
  'skip-back': { symbol: '⏮', width: 1.0 },
  'skip-forward': { symbol: '⏭', width: 1.0 },
  'replay': { symbol: '⏮', width: 1.0 },
  'shuffle': { symbol: '🔀', width: 1.0 },
  'repeat': { symbol: '🔁', width: 1.0 },
};

export default function SVGIcon({ name, size = 24, color = COLORS.primary, style }: SVGIconProps) {
  const iconData = iconMap[name] || { symbol: '?', width: 1.0 };
  
  return (
    <View style={[
      styles.container,
      { 
        width: size, 
        height: size,
        minWidth: size * iconData.width,
      },
      style
    ]}>
      <Text style={[
        styles.icon,
        {
          fontSize: size * 0.7,
          color: color,
          lineHeight: size,
          textAlign: 'center',
        }
      ]}>
        {iconData.symbol}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontWeight: '600',
    textAlignVertical: 'center',
    includeFontPadding: false,
    textAlign: 'center',
  },
});
