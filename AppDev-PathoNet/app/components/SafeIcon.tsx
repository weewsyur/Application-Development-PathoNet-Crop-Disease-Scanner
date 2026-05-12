import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import FallbackIcon from '../_fallback-icon';

interface SafeIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color?: string;
  style?: any;
}

export default function SafeIcon({ name, size = 24, color, style }: SafeIconProps) {
  // On web, try Ionicons first, fallback to emoji if it fails
  if (Platform.OS === 'web') {
    try {
      return (
        <Ionicons
          name={name}
          size={size}
          color={color}
          style={style}
          onError={(e: any) => {
            console.warn(`[SafeIcon] Icon "${name}" failed to load, using fallback`);
            // Could trigger fallback here if needed
          }}
        />
      );
    } catch (error) {
      console.warn(`[SafeIcon] Error rendering icon "${name}":`, error);
      return <FallbackIcon name={name as string} size={size} color={color} style={style} />;
    }
  }

  // On native platforms, use Ionicons directly
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
    />
  );
}
