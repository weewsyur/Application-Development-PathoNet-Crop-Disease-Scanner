/**
 * Responsive Design Constants
 * 
 * Cross-device compatibility for all screen sizes
 */

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Screen size breakpoints
export const SCREEN_SIZES = {
  SMALL: 320,    // iPhone SE
  MEDIUM: 768,   // iPad mini, large phones
  LARGE: 1024,    // iPad, small desktop
  EXTRA_LARGE: 1440, // large desktop
} as const;

// Device type detection
export const getDeviceType = (): 'small' | 'medium' | 'large' | 'extra-large' => {
  if (width < SCREEN_SIZES.MEDIUM) return 'small';
  if (width < SCREEN_SIZES.LARGE) return 'medium';
  if (width < SCREEN_SIZES.EXTRA_LARGE) return 'large';
  return 'extra-large';
};

// Responsive utilities
export const isSmallDevice = () => getDeviceType() === 'small';
export const isMediumDevice = () => getDeviceType() === 'medium';
export const isLargeDevice = () => getDeviceType() === 'large';
export const isExtraLargeDevice = () => getDeviceType() === 'extra-large';

// Platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Responsive spacing and sizing
export const getResponsiveSpacing = (base: number) => {
  const deviceType = getDeviceType();
  const multiplier = {
    'small': 0.8,
    'medium': 1.0,
    'large': 1.2,
    'extra-large': 1.4,
  }[deviceType];
  return base * multiplier;
};

export const getResponsiveFontSize = (base: number) => {
  const deviceType = getDeviceType();
  const multiplier = {
    'small': 0.9,
    'medium': 1.0,
    'large': 1.1,
    'extra-large': 1.2,
  }[deviceType];
  return base * multiplier;
};

// Orientation detection
export const isPortrait = () => height > width;
export const isLandscape = () => width > height;

export default {
  SCREEN_SIZES,
  getDeviceType,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isExtraLargeDevice,
  isIOS,
  isAndroid,
  isWeb,
  getResponsiveSpacing,
  getResponsiveFontSize,
  isPortrait,
  isLandscape,
  width,
  height,
};
