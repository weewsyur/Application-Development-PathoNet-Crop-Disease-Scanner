/**
 * app/(auth)/OtpVerification.tsx - OTP Verification Screen
 * Handles OTP input, verification, and resend functionality
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { sendOTPEmail } from '@/services/emailService';
import { verifyOTP, canRequestOTP, setOTPRequestCooldown, getCooldownRemaining, OTP_CONFIG, generateOTP, storeOTPData } from '@/services/otpService';
import { maskEmail, formatTimeRemaining, generateOTPInputRefs, focusNextOTPInput, focusPreviousOTPInput, getOTPFromInputs, clearOTPInputs, isOTPComplete } from '@/utils/otpHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '@/constants/theme';
import { STORAGE_KEYS } from '@/lib/storage';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OtpVerificationScreenProps {
  email?: string;
  username?: string;
  uid?: string;
}

export default function OtpVerificationScreen({ email: initialEmail, username: initialUsername, uid: initialUid }: OtpVerificationScreenProps) {
  const router = useRouter();

  // State
  const [email, setEmail] = useState(initialEmail || '');
  const [username, setUsername] = useState(initialUsername || '');
  const [uid, setUid] = useState(initialUid || '');
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(OTP_CONFIG.EXPIRATION_MINUTES * 60);
  const [isExpired, setIsExpired] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Refs for OTP inputs
  const inputRefs = useRef(generateOTPInputRefs(6));
  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);
  const expirationInterval = useRef<NodeJS.Timeout | null>(null);

  // Enhanced recovery flow for app reloads and incomplete states
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('[OtpVerification] Loading user data for recovery...');

        // Load temporary signup data
        const storedEmail = await AsyncStorage.getItem('temp_signup_email');
        const storedUsername = await AsyncStorage.getItem('temp_signup_username');
        const storedUid = await AsyncStorage.getItem('temp_signup_uid');

        // Check if we have recovery data
        if (storedEmail && storedUsername && storedUid) {
          console.log('[OtpVerification] Found recovery data:', { storedEmail, storedUsername, storedUid });

          if (!email || !username || !uid) {
            setEmail(storedEmail);
            setUsername(storedUsername);
            setUid(storedUid);
            setIsRecovering(true);
          }
        } else {
          console.log('[OtpVerification] No recovery data found');

          // If no recovery data but user is authenticated, check their verification status
          const mainUid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
          if (mainUid && (!email || !username || !uid)) {
            console.log('[OtpVerification] User authenticated but missing recovery data, redirecting to signup');
            router.replace('/(auth)/SignUp' as any);
            return;
          }
        }
      } catch (error) {
        console.error('[OtpVerification] Error loading user data:', error);
      }
    };

    loadUserData();
  }, [email, username, uid]);

  // Auto-redirect if user is already verified
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (uid && !isRecovering) {
        try {
          // Check if user is already verified
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData?.otpVerified && userData?.termsAccepted) {
              console.log('[OtpVerification] User already verified, redirecting to home');
              router.replace('/(tabs)/Home' as any);
              return;
            } else if (userData?.otpVerified && !userData?.termsAccepted) {
              console.log('[OtpVerification] User OTP verified but terms not accepted, redirecting to terms');
              router.replace('/(auth)/Terms' as any);
              return;
            }
          }
        } catch (error) {
          console.error('[OtpVerification] Error checking verification status:', error);
        }
      }
    };

    checkVerificationStatus();
  }, [uid, isRecovering]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownInterval.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (cooldownInterval.current) {
              clearInterval(cooldownInterval.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, [cooldown]);

  // Expiration timer
  useEffect(() => {
    if (timeRemaining > 0 && !success) {
      expirationInterval.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsExpired(true);
            if (expirationInterval.current) {
              clearInterval(expirationInterval.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (expirationInterval.current) {
        clearInterval(expirationInterval.current);
      }
    };
  }, [timeRemaining, success]);

  // Check initial cooldown
  useEffect(() => {
    const checkCooldown = async () => {
      const remaining = await getCooldownRemaining();
      if (remaining > 0) {
        setCooldown(remaining);
      }
    };

    checkCooldown();
  }, []);

  // Handle OTP input change
  const handleOTPChange = (index: number, value: string) => {
    const newOTP = [...otp];
    newOTP[index] = value;
    setOTP(newOTP);

    // Auto-focus next input
    if (value.length === 1) {
      focusNextOTPInput(index, inputRefs.current, value);
    }

    // Clear error when user starts typing
    if (error) {
      setError('');
    }

    // Auto-verify when OTP is complete
    if (isOTPComplete(newOTP.join(''))) {
      setTimeout(() => {
        handleVerify();
      }, 300);
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace') {
      focusPreviousOTPInput(index, inputRefs.current, otp[index]);
    }
  };

  // Verify OTP
  const handleVerify = useCallback(async () => {
    const otpCode = otp.join('');

    if (!isOTPComplete(otpCode)) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!email) {
      setError('Email not found. Please start over.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyOTP(email, otpCode);

      if (result.success) {
        setSuccess(true);

        // Update Firestore with OTP verification status
        if (uid) {
          await updateDoc(doc(db, 'users', uid), {
            otpVerified: true,
            emailVerified: true,
            updatedAt: serverTimestamp(),
          });
        }

        // Clear temporary storage
        await AsyncStorage.multiRemove(['temp_signup_email', 'temp_signup_username', 'temp_signup_uid']);

        // Show success and navigate to terms
        Alert.alert(
          'Email Verified!',
          'Your email has been successfully verified.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/(auth)/Terms' as any),
            },
          ]
        );
      } else {
        setError(result.message);

        // Handle specific cases
        if (result.isExpired) {
          setIsExpired(true);
        } else if (result.isLocked) {
          // Clear inputs on lockout
          clearOTPInputs(inputRefs.current);
          setOTP(['', '', '', '', '', '']);
        }
      }
    } catch (error) {
      console.error('[OtpVerification] Verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otp, email, uid, router]);

  // Resend OTP
  const handleResend = useCallback(async () => {
    if (!email) {
      setError('Email not found. Please start over.');
      return;
    }

    // Check cooldown
    const cooldownCheck = await canRequestOTP();
    if (!cooldownCheck.canResend) {
      setError(cooldownCheck.message);
      return;
    }

    setIsResending(true);
    setError('');

    try {
      // Generate new OTP
      const newOTP = generateOTP();
      console.log('[OtpVerification] Generated new OTP for resend:', newOTP);

      // Store new OTP data
      await storeOTPData(email, newOTP);
      console.log('[OtpVerification] New OTP data stored');

      // Send OTP email
      const result = await sendOTPEmail(email, newOTP, username);

      if (result.success) {
        // Set cooldown
        await setOTPRequestCooldown();
        const remaining = await getCooldownRemaining();
        setCooldown(remaining);

        // Reset timers
        setTimeRemaining(OTP_CONFIG.EXPIRATION_MINUTES * 60);
        setIsExpired(false);

        // Clear inputs
        clearOTPInputs(inputRefs.current);
        setOTP(['', '', '', '', '', '']);

        Alert.alert('OTP Sent', `A new verification code has been sent to ${maskEmail(email)}`);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('[OtpVerification] Resend error:', error);
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [email, username]);

  // Enhanced go back with cleanup
  const handleGoBack = () => {
    console.log('[OtpVerification] Going back from OTP screen');

    // If recovering from incomplete state, clean up
    if (isRecovering) {
      const cleanup = async () => {
        try {
          await AsyncStorage.multiRemove(['temp_signup_email', 'temp_signup_username', 'temp_signup_uid']);
          console.log('[OtpVerification] Cleaned up recovery data');
        } catch (error) {
          console.error('[OtpVerification] Error cleaning up recovery data:', error);
        }
      };
      cleanup();
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Email Icon */}
          <View style={styles.iconContainer}>
            <Mail size={48} color={COLORS.primary} />
          </View>

          {/* Enhanced instructions with recovery indicator */}
          {isRecovering && (
            <View style={styles.recoveryBanner}>
              <Text style={styles.recoveryText}>
                🔄 Continuing your verification process
              </Text>
            </View>
          )}

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{'\n'}
            <Text style={styles.emailText}>{maskEmail(email)}</Text>
          </Text>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <Clock size={16} color={isExpired ? COLORS.error : COLORS.textMid} />
            <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
              {isExpired ? 'Code expired' : `Expires in ${formatTimeRemaining(timeRemaining)}`}
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={inputRefs.current[index]}
                style={[
                  styles.otpInput,
                  error && styles.otpInputError,
                  success && styles.otpInputSuccess,
                ]}
                value={digit}
                onChangeText={(value) => handleOTPChange(index, value)}
                onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(index, key)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                editable={!isLoading && !isExpired}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Status Messages */}
          {error ? (
            <View style={styles.errorContainer}>
              <XCircle size={20} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {success ? (
            <View style={styles.successContainer}>
              <CheckCircle size={20} color={COLORS.success} />
              <Text style={styles.successText}>Email verified successfully!</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!isOTPComplete(otp.join('')) || isLoading || isExpired) && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={!isOTPComplete(otp.join('')) || isLoading || isExpired}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending || cooldown > 0 || isExpired}
              style={[styles.resendButton, (isResending || cooldown > 0 || isExpired) && styles.resendButtonDisabled]}
            >
              {isResending ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <>
                  <RefreshCw size={16} color={cooldown > 0 || isExpired ? COLORS.textLight : COLORS.primary} />
                  <Text style={[styles.resendButtonText, (cooldown > 0 || isExpired) && styles.resendButtonTextDisabled]}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.xxl,
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
    alignItems: 'center',
    gap: SIZES.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: SIZES.radiusXl,
    backgroundColor: COLORS.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontWeight: '600',
    color: COLORS.textDark,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    padding: SIZES.sm,
    backgroundColor: COLORS.inputBg,
    borderRadius: SIZES.radius,
  },
  timerText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
    fontWeight: '500',
  },
  timerTextExpired: {
    color: COLORS.error,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: SIZES.sm,
    width: '100%',
    justifyContent: 'center',
  },
  otpInput: {
    width: 50,
    height: 60,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  otpInputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLighter,
  },
  otpInputSuccess: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.successLighter,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    padding: SIZES.md,
    backgroundColor: COLORS.errorLighter,
    borderRadius: SIZES.radius,
    width: '100%',
  },
  errorText: {
    fontSize: SIZES.fontSm,
    color: COLORS.error,
    fontWeight: '500',
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    padding: SIZES.md,
    backgroundColor: COLORS.successLighter,
    borderRadius: SIZES.radius,
    width: '100%',
  },
  successText: {
    fontSize: SIZES.fontSm,
    color: COLORS.success,
    fontWeight: '500',
    flex: 1,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: COLORS.textLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.font,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendContainer: {
    alignItems: 'center',
    gap: SIZES.sm,
    width: '100%',
  },
  resendText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: COLORS.textLight,
  },
  recoveryBanner: {
    backgroundColor: COLORS.primaryLighter,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  recoveryText: {
    fontSize: SIZES.font,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
});
