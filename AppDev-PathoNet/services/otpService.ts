/**
 * services/otpService.ts - OTP Generation and Verification Service
 * Handles OTP generation, storage, validation, and expiration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Storage keys
const OTP_STORAGE_KEY = 'patho_otp_data';
const OTP_REQUEST_COOLDOWN_KEY = 'patho_otp_cooldown';

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRATION_MINUTES: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_ATTEMPTS: 3,
  LOCKOUT_MINUTES: 15,
} as const;

export interface OTPData {
  email: string;
  otp: string;
  hashedOTP: string;
  timestamp: number;
  expiresAt: number;
  attempts: number;
  isLocked: boolean;
  lockedUntil?: number;
}

export interface OTPVerificationResult {
  success: boolean;
  message: string;
  isExpired?: boolean;
  isLocked?: boolean;
  remainingAttempts?: number;
}

export interface OTPRequestResult {
  success: boolean;
  message: string;
  canResend?: boolean;
  cooldownRemaining?: number;
}

/**
 * Generate a secure 6-digit OTP
 */
export const generateOTP = (): string => {
  // Generate cryptographically secure random number
  const randomBytes = new Uint8Array(4);
  crypto.getRandomValues(randomBytes);
  const randomNum = new DataView(randomBytes.buffer).getUint32(0, false);
  return String(randomNum % 1000000).padStart(6, '0');
};

/**
 * Hash OTP for secure storage
 */
export const hashOTP = (otp: string, email: string): string => {
  const salt = email.toLowerCase().trim();
  return CryptoJS.SHA256(otp + salt).toString();
};

/**
 * Store OTP data securely
 */
export const storeOTPData = async (email: string, otp: string): Promise<void> => {
  try {
    const now = Date.now();
    const hashedOTP = hashOTP(otp, email);
    
    const otpData: OTPData = {
      email: email.toLowerCase().trim(),
      otp, // Store plain OTP temporarily for development (remove in production)
      hashedOTP,
      timestamp: now,
      expiresAt: now + (OTP_CONFIG.EXPIRATION_MINUTES * 60 * 1000),
      attempts: 0,
      isLocked: false,
    };

    await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
    console.log('[OTPService] OTP data stored for email:', email);
  } catch (error) {
    console.error('[OTPService] Error storing OTP data:', error);
    throw new Error('Failed to store OTP data');
  }
};

/**
 * Retrieve OTP data
 */
export const getOTPData = async (): Promise<OTPData | null> => {
  try {
    const data = await AsyncStorage.getItem(OTP_STORAGE_KEY);
    if (!data) return null;
    
    const otpData = JSON.parse(data) as OTPData;
    
    // Check if OTP is expired
    if (Date.now() > otpData.expiresAt) {
      await clearOTPData();
      return null;
    }
    
    // Check if locked out
    if (otpData.isLocked && otpData.lockedUntil && Date.now() < otpData.lockedUntil) {
      return otpData; // Return locked data to handle lockout
    }
    
    // Unlock if lockout period is over
    if (otpData.isLocked && otpData.lockedUntil && Date.now() >= otpData.lockedUntil) {
      otpData.isLocked = false;
      otpData.attempts = 0;
      await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
    }
    
    return otpData;
  } catch (error) {
    console.error('[OTPService] Error retrieving OTP data:', error);
    return null;
  }
};

/**
 * Clear OTP data
 */
export const clearOTPData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OTP_STORAGE_KEY);
    console.log('[OTPService] OTP data cleared');
  } catch (error) {
    console.error('[OTPService] Error clearing OTP data:', error);
  }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (email: string, otp: string): Promise<OTPVerificationResult> => {
  try {
    const otpData = await getOTPData();
    
    if (!otpData) {
      return {
        success: false,
        message: 'OTP expired or not found. Please request a new OTP.',
        isExpired: true,
      };
    }

    // Check if email matches
    if (otpData.email !== email.toLowerCase().trim()) {
      return {
        success: false,
        message: 'Invalid OTP',
      };
    }

    // Check if locked out
    if (otpData.isLocked && otpData.lockedUntil && Date.now() < otpData.lockedUntil) {
      const remainingMinutes = Math.ceil((otpData.lockedUntil - Date.now()) / (60 * 1000));
      return {
        success: false,
        message: `Account temporarily locked. Try again in ${remainingMinutes} minutes.`,
        isLocked: true,
      };
    }

    // Check expiration
    if (Date.now() > otpData.expiresAt) {
      await clearOTPData();
      return {
        success: false,
        message: 'OTP expired. Please request a new OTP.',
        isExpired: true,
      };
    }

    // Verify OTP hash
    const hashedInput = hashOTP(otp, email);
    const isValid = hashedInput === otpData.hashedOTP;

    if (!isValid) {
      // Increment attempts
      otpData.attempts += 1;
      
      // Check if should lock out
      if (otpData.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
        otpData.isLocked = true;
        otpData.lockedUntil = Date.now() + (OTP_CONFIG.LOCKOUT_MINUTES * 60 * 1000);
        
        await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
        
        return {
          success: false,
          message: `Too many failed attempts. Account locked for ${OTP_CONFIG.LOCKOUT_MINUTES} minutes.`,
          isLocked: true,
        };
      }
      
      await AsyncStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otpData));
      
      const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts;
      return {
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      };
    }

    // OTP is valid - clear data and return success
    await clearOTPData();
    
    return {
      success: true,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('[OTPService] Error verifying OTP:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    };
  }
};

/**
 * Check if user can request new OTP (cooldown)
 */
export const canRequestOTP = async (): Promise<OTPRequestResult> => {
  try {
    const cooldownData = await AsyncStorage.getItem(OTP_REQUEST_COOLDOWN_KEY);
    
    if (!cooldownData) {
      return {
        success: true,
        message: 'Can request OTP',
        canResend: true,
      };
    }

    const { timestamp } = JSON.parse(cooldownData);
    const now = Date.now();
    const timeSinceRequest = now - timestamp;
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    
    if (timeSinceRequest >= cooldownMs) {
      await AsyncStorage.removeItem(OTP_REQUEST_COOLDOWN_KEY);
      return {
        success: true,
        message: 'Can request OTP',
        canResend: true,
      };
    }

    const cooldownRemaining = Math.ceil((cooldownMs - timeSinceRequest) / 1000);
    
    return {
      success: false,
      message: `Please wait ${cooldownRemaining} seconds before requesting another OTP`,
      canResend: false,
      cooldownRemaining,
    };
  } catch (error) {
    console.error('[OTPService] Error checking OTP cooldown:', error);
    return {
      success: true,
      message: 'Can request OTP',
      canResend: true,
    };
  }
};

/**
 * Set OTP request cooldown
 */
export const setOTPRequestCooldown = async (): Promise<void> => {
  try {
    const cooldownData = {
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(OTP_REQUEST_COOLDOWN_KEY, JSON.stringify(cooldownData));
  } catch (error) {
    console.error('[OTPService] Error setting OTP cooldown:', error);
  }
};

/**
 * Get remaining cooldown seconds
 */
export const getCooldownRemaining = async (): Promise<number> => {
  try {
    const cooldownData = await AsyncStorage.getItem(OTP_REQUEST_COOLDOWN_KEY);
    if (!cooldownData) return 0;
    
    const { timestamp } = JSON.parse(cooldownData);
    const now = Date.now();
    const timeSinceRequest = now - timestamp;
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    
    const remaining = cooldownMs - timeSinceRequest;
    return Math.max(0, Math.ceil(remaining / 1000));
  } catch (error) {
    console.error('[OTPService] Error getting cooldown remaining:', error);
    return 0;
  }
};
