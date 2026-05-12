/**
 * Production Debugging Utilities
 * 
 * Centralized debugging for Firebase Hosting deployment
 */

export function logEnvironmentInfo() {
  const info = {
    environment: process.env.NODE_ENV,
    isDev: __DEV__,
    platform: typeof window !== 'undefined' ? 'web' : 'native',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
    timestamp: new Date().toISOString(),
    firebaseConfig: {
      hasApiKey: !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      hasProjectId: !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      hasAppId: !!process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    },
    apiConfig: {
      productionUrl: process.env.EXPO_PUBLIC_PRODUCTION_API_URL,
      customUrl: process.env.EXPO_PUBLIC_API_URL,
    }
  };

  console.log('[DEBUG] Environment Info:', info);
  return info;
}

export function logError(error: any, context?: string) {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    stack: error?.stack || 'No stack trace',
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
  };

  console.error('[DEBUG] Error:', errorInfo);
  
  // In production, you might want to send this to an error reporting service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Add error reporting service integration
    console.warn('[DEBUG] Production error detected - consider adding error reporting');
  }
}

export function logApiCall(url: string, method: string, status?: number, error?: any) {
  const apiInfo = {
    url,
    method,
    status,
    error: error?.message || 'No error',
    timestamp: new Date().toISOString(),
  };

  if (error) {
    console.error('[DEBUG] API Error:', apiInfo);
  } else {
    console.log('[DEBUG] API Call:', apiInfo);
  }
}
