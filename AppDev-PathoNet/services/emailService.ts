/**
 * services/emailService.ts - EmailJS Email Service
 * Handles sending OTP emails using EmailJS
 */

import emailjs from 'emailjs-com';
import { Platform } from 'react-native';

// EmailJS Configuration from environment variables
const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY || '';

// EmailJS initialization
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface EmailTemplateParams extends Record<string, unknown> {
  to_email: string;
  to_name: string;
  otp_code: string;
  expiration_minutes: string;
  app_name: string;
  email?: string;
  recipient_email?: string;
  to?: string;
  user_email?: string;
  recipient?: string;
}

export interface EmailServiceResponse {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Send OTP verification email
 */
export const sendOTPEmail = async (
  email: string,
  otp: string,
  userName: string = 'User'
): Promise<EmailServiceResponse> => {
  try {
    // Validate environment variables
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
      return {
        success: false,
        message: 'EmailJS configuration missing. Please check environment variables.',
      };
    }

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        success: false,
        message: 'Invalid email address',
      };
    }

    // Validate OTP
    if (!otp || otp.length !== 6) {
      return {
        success: false,
        message: 'Invalid OTP code',
      };
    }

    const templateParams: EmailTemplateParams = {
      to_email: email,
      to_name: userName,
      otp_code: otp,
      expiration_minutes: '5',
      app_name: 'PathoNet',
      // Add common alternative field names for EmailJS compatibility
      email: email,
      recipient_email: email,
      to: email,
      user_email: email,
      recipient: email,
    };

    console.log('[EmailService] Sending OTP email to:', email);
    console.log('[EmailService] Template params:', templateParams);

    // Send email using EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('[EmailService] Email sent successfully:', response.status);

    return {
      success: true,
      message: 'OTP email sent successfully',
    };
  } catch (error: any) {
    console.error('[EmailService] Error sending email:', error);

    let errorMessage = 'Failed to send OTP email';

    // Handle specific EmailJS errors
    if (error.status === 400) {
      errorMessage = 'Invalid email template or parameters';
    } else if (error.status === 401) {
      errorMessage = 'EmailJS authentication failed';
    } else if (error.status === 403) {
      errorMessage = 'EmailJS service not authorized';
    } else if (error.status === 429) {
      errorMessage = 'Too many email requests. Please try again later';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      error,
    };
  }
};

/**
 * Validate EmailJS configuration
 */
export const validateEmailJSConfig = (): boolean => {
  return !!(
    EMAILJS_SERVICE_ID &&
    EMAILJS_TEMPLATE_ID &&
    EMAILJS_PUBLIC_KEY
  );
};

/**
 * Get EmailJS configuration status
 */
export const getEmailJSConfigStatus = () => {
  return {
    serviceId: EMAILJS_SERVICE_ID ? 'configured' : 'missing',
    templateId: EMAILJS_TEMPLATE_ID ? 'configured' : 'missing',
    publicKey: EMAILJS_PUBLIC_KEY ? 'configured' : 'missing',
    isValid: validateEmailJSConfig(),
  };
};
