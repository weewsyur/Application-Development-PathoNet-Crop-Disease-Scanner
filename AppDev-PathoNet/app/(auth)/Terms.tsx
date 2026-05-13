/**
 * app/(auth)/Terms.tsx - Terms and Conditions Screen
 * Handles terms acceptance before accessing the main app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ArrowLeft, FileText } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '@/constants/theme';
import { STORAGE_KEYS } from '@/lib/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TermsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uid, setUid] = useState('');

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
        if (storedUid) {
          setUid(storedUid);
        }
      } catch (error) {
        console.error('[Terms] Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please read and accept the terms and conditions to continue.');
      return;
    }

    if (!uid) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    setIsLoading(true);

    try {
      // Update Firestore with terms acceptance
      await updateDoc(doc(db, 'users', uid), {
        termsAccepted: true,
        termsAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('[Terms] Terms accepted for user:', uid);

      // Navigate to home
      Alert.alert(
        'Welcome to PathoNet!',
        'Thank you for accepting our terms and conditions.',
        [
          {
            text: 'Get Started',
            onPress: () => router.replace('/(tabs)/Home'),
          },
        ]
      );
    } catch (error) {
      console.error('[Terms] Error accepting terms:', error);
      Alert.alert('Error', 'Failed to save terms acceptance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle decline
  const handleDeclineTerms = () => {
    Alert.alert(
      'Terms Required',
      'You must accept the terms and conditions to use PathoNet. If you decline, you will be signed out.',
      [
        {
          text: 'Go Back',
          style: 'cancel',
        },
        {
          text: 'Decline & Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([STORAGE_KEYS.PATHONET_UID]);
              router.replace('/(auth)/SignUp');
            } catch (error) {
              console.error('[Terms] Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <FileText size={48} color={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>PathoNet Terms of Service</Text>
        <Text style={styles.subtitle}>
          Please read and accept our terms and conditions to continue using PathoNet.
        </Text>

        {/* Terms Content */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.termsText}>
            By accessing and using PathoNet, you accept and agree to be bound by the terms
            and provision of this agreement.
          </Text>

          <Text style={styles.termsTitle}>2. Use License</Text>
          <Text style={styles.termsText}>
            Permission is granted to temporarily use PathoNet for personal, non-commercial
            transitory viewing only. This is the grant of a license, not a transfer of title.
          </Text>

          <Text style={styles.termsTitle}>3. Disclaimer</Text>
          <Text style={styles.termsText}>
            The information on PathoNet is provided on an as-is basis. PathoNet disclaims
            all warranties, express or implied, including but not limited to implied warranties
            of merchantability and fitness for a particular purpose.
          </Text>

          <Text style={styles.termsTitle}>4. Plant Disease Diagnosis</Text>
          <Text style={styles.termsText}>
            PathoNet provides AI-powered plant disease detection as a supportive tool.
            Results should be used as guidance and not as a substitute for professional
            agricultural advice.
          </Text>

          <Text style={styles.termsTitle}>5. Privacy</Text>
          <Text style={styles.termsText}>
            Your use of PathoNet is also governed by our Privacy Policy, which outlines
            how we collect, use, and protect your personal information and plant scan data.
          </Text>

          <Text style={styles.termsTitle}>6. User Responsibilities</Text>
          <Text style={styles.termsText}>
            You are responsible for maintaining the confidentiality of your account and
            for all activities that occur under your account. You agree to notify us immediately
            of any unauthorized use of your account.
          </Text>

          <Text style={styles.termsTitle}>7. Limitation of Liability</Text>
          <Text style={styles.termsText}>
            In no event shall PathoNet, nor its suppliers, be liable for any damages
            (including, without limitation, damages for loss of data or profit, or due to
            business interruption) arising out of the use or inability to use PathoNet.
          </Text>

          <Text style={styles.termsTitle}>8. Termination</Text>
          <Text style={styles.termsText}>
            We may terminate or suspend your access immediately, without prior notice or
            liability, for any reason whatsoever, including without limitation if you breach
            the terms.
          </Text>

          <Text style={styles.termsTitle}>9. Governing Law</Text>
          <Text style={styles.termsText}>
            These terms shall be interpreted and governed by the laws of the jurisdiction
            in which PathoNet operates, without regard to conflict of law provisions.
          </Text>

          <Text style={styles.termsTitle}>10. Changes to Terms</Text>
          <Text style={styles.termsText}>
            We reserve the right, at our sole discretion, to modify or replace these Terms
            at any time. If a revision is material, we will try to provide at least 30 days
            notice prior to any new terms taking effect.
          </Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setTermsAccepted(!termsAccepted)}
          disabled={isLoading}
        >
          <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
            {termsAccepted && <Check size={16} color={COLORS.white} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the Terms & Conditions
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              (!termsAccepted || isLoading) && styles.acceptButtonDisabled,
            ]}
            onPress={handleAcceptTerms}
            disabled={!termsAccepted || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept & Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDeclineTerms}
            disabled={isLoading}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  backButton: {
    padding: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.inputBg,
  },
  headerTitle: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
  },
  scrollContent: {
    paddingBottom: SIZES.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusXl,
    backgroundColor: COLORS.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SIZES.xl,
  },
  termsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    marginBottom: SIZES.xl,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  termsTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  termsText: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    lineHeight: 20,
    marginBottom: SIZES.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xl,
    padding: SIZES.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: SIZES.radiusSm,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: SIZES.font,
    color: COLORS.textDark,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: SIZES.md,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.lg,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: SIZES.font,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineButtonText: {
    color: COLORS.textMid,
    fontSize: SIZES.font,
    fontWeight: '600',
  },
});
