/**
 * utils/otpHelpers.ts - OTP Utility Functions
 * Helper functions for OTP formatting, validation, and UI utilities
 */

export const formatOTPInput = (value: string, maxLength: number = 6): string => {
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  // Limit to max length
  return digitsOnly.slice(0, maxLength);
};

export const isValidOTPFormat = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

export const isOTPComplete = (otp: string): boolean => {
  return otp.length === 6 && /^\d+$/.test(otp);
};

export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (!username || !domain) return email;
  
  // Mask first part of email, show first 2 and last 2 characters
  const maskedUsername = 
    username.length <= 4 
      ? username.charAt(0) + '*'.repeat(username.length - 1)
      : username.substring(0, 2) + '*'.repeat(username.length - 4) + username.substring(username.length - 2);
  
  return `${maskedUsername}@${domain}`;
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getOTPErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.code) {
    switch (error.code) {
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
  
  return 'An unexpected error occurred. Please try again.';
};

export const generateOTPInputRefs = (length: number = 6) => {
  return Array.from({ length }, () => ({ current: null }));
};

export const focusNextOTPInput = (
  currentIndex: number,
  refs: React.RefObject<any>[],
  value: string
) => {
  if (value.length === 1 && currentIndex < refs.length - 1) {
    refs[currentIndex + 1].current?.focus();
  }
};

export const focusPreviousOTPInput = (
  currentIndex: number,
  refs: React.RefObject<any>[],
  value: string
) => {
  if (value.length === 0 && currentIndex > 0) {
    refs[currentIndex - 1].current?.focus();
  }
};

export const getOTPFromInputs = (refs: React.RefObject<any>[]): string => {
  return refs.map(ref => ref.current?.value || '').join('');
};

export const clearOTPInputs = (refs: React.RefObject<any>[]) => {
  refs.forEach((ref, index) => {
    if (ref.current) {
      ref.current.value = '';
      ref.current.clear?.();
    }
  });
  // Focus first input
  refs[0].current?.focus();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
