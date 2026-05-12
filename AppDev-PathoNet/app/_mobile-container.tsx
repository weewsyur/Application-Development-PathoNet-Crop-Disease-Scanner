import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/constants/theme';

interface MobileContainerProps {
  children: React.ReactNode;
}

export default function MobileContainer({ children }: MobileContainerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    maxWidth: 768, // Max mobile width
    marginHorizontal: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.xl, // Extra padding for mobile navigation
  },
});
