/**
 * components/AuthGuard.tsx - Navigation Guard Component
 * Protects routes based on authentication and verification status
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS, SIZES } from '@/constants/theme';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOtp?: boolean;
  requireTerms?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requireOtp = true,
  requireTerms = true,
  redirectTo,
}) => {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isOtpVerified, 
    areTermsAccepted, 
    isLoading,
    user,
    userProfile 
  } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication requirements
    if (requireAuth && !isAuthenticated) {
      console.log('[AuthGuard] User not authenticated, redirecting to signup');
      router.replace('/(auth)/SignUp' as any);
      return;
    }

    // Check OTP verification requirements
    if (requireOtp && isAuthenticated && !isOtpVerified) {
      console.log('[AuthGuard] OTP not verified, redirecting to OTP verification');
      // Store user data for OTP screen if not already stored
      if (user && userProfile) {
        // User exists but OTP not verified - redirect to OTP
        router.replace('/(auth)/OtpVerification' as any);
      } else {
        router.replace('/(auth)/SignUp' as any);
      }
      return;
    }

    // Check terms acceptance requirements
    if (requireTerms && isAuthenticated && isOtpVerified && !areTermsAccepted) {
      console.log('[AuthGuard] Terms not accepted, redirecting to terms');
      router.replace('/(auth)/Terms' as any);
      return;
    }

    // Custom redirect
    if (redirectTo && isAuthenticated && isOtpVerified && areTermsAccepted) {
      router.replace(redirectTo as any);
      return;
    }
  }, [
    isLoading,
    isAuthenticated,
    isOtpVerified,
    areTermsAccepted,
    user,
    userProfile,
    router,
    requireAuth,
    requireOtp,
    requireTerms,
    redirectTo,
  ]);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show nothing while redirecting
  if (
    (requireAuth && !isAuthenticated) ||
    (requireOtp && isAuthenticated && !isOtpVerified) ||
    (requireTerms && isAuthenticated && isOtpVerified && !areTermsAccepted)
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.md,
  },
  loadingText: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    fontWeight: '500',
  },
});
