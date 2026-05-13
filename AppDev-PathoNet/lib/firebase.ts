import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase config before initialization
const requiredConfigKeys = [
  'apiKey',
  'projectId',
  'appId',
] as const;

const missingConfigKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

// Initialize Firebase app with graceful fallback
let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let firebaseDBInstance: Firestore | null = null;

if (missingConfigKeys.length > 0) {
  console.warn(`[Firebase] Missing required config keys: ${missingConfigKeys.join(', ')}`);
  console.warn('[Firebase] Please set EXPO_PUBLIC_FIREBASE_* environment variables in .env');
  console.warn('[Firebase] Running in development mode without Firebase - some features will be limited');
} else {
  try {
    // Initialize Firebase app only once
    firebaseAppInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

    // Configure Auth for web to prevent reCAPTCHA issues
    firebaseAuthInstance = getAuth(firebaseAppInstance);

    // Note: Auth settings are configured in Firebase Console
    // For web development, ensure:
    // 1. Email/Password is enabled in Firebase Console
    // 2. Authorized domains include localhost and your production domain
    // 3. reCAPTCHA is properly configured

    firebaseDBInstance = getFirestore(firebaseAppInstance);
    console.log('[Firebase] Successfully initialized Firebase');
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error);
    console.warn('[Firebase] Running in development mode without Firebase - some features will be limited');
  }
}

// Export Firebase instances with fallback handling
export const firebaseApp = firebaseAppInstance;
export const firebaseAuth = firebaseAuthInstance;
export const firebaseDB = firebaseDBInstance;

// Backward compatibility exports - create mock implementations when Firebase is not available
const createMockAuth = () => {
  const mockAuth = {
    currentUser: null,
    signInWithEmailAndPassword: async (email: string, password: string) => {
      console.warn('[Firebase] signInWithEmailAndPassword called but Firebase Auth is not configured');
      console.warn('[Firebase] Please set EXPO_PUBLIC_FIREBASE_* environment variables in .env');
      // Simulate async delay
      await new Promise(resolve => setTimeout(resolve, 500));
      // Return a mock user object to prevent crashes
      return { user: { uid: 'mock-user-' + Date.now(), email, emailVerified: false }, credential: null };
    },
    createUserWithEmailAndPassword: async (email: string, password: string) => {
      console.warn('[Firebase] createUserWithEmailAndPassword called but Firebase Auth is not configured');
      console.warn('[Firebase] Please set EXPO_PUBLIC_FIREBASE_* environment variables in .env');
      // Simulate async delay
      await new Promise(resolve => setTimeout(resolve, 500));
      // Return a mock user object to prevent crashes
      return { user: { uid: 'mock-user-' + Date.now(), email, emailVerified: false }, credential: null };
    },
    signOut: async () => {
      console.warn('[Firebase] SignOut called but Firebase Auth is not configured');
      await new Promise(resolve => setTimeout(resolve, 300));
    },
    onAuthStateChanged: (callback: Function) => {
      console.warn('[Firebase] onAuthStateChanged called but Firebase Auth is not configured');
      // Call callback with null user immediately
      callback(null);
      return () => { }; // Return unsubscribe function
    },
  } as any; // Type assertion to bypass strict typing
  return mockAuth;
};

const createMockDB = () => {
  const mockDB = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => console.warn('[Firebase] Firestore write called but not configured'),
        update: async () => console.warn('[Firebase] Firestore update called but not configured'),
        delete: async () => console.warn('[Firebase] Firestore delete called but not configured'),
      }),
      add: async () => console.warn('[Firebase] Firestore add called but not configured'),
      get: async () => ({ docs: [] }),
      where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }),
    }),
    doc: () => ({
      get: async () => ({ exists: false, data: () => null }),
      set: async () => console.warn('[Firebase] Firestore write called but not configured'),
      update: async () => console.warn('[Firebase] Firestore update called but not configured'),
      delete: async () => console.warn('[Firebase] Firestore delete called but not configured'),
    }),
  } as any; // Type assertion to bypass strict typing
  return mockDB;
};

export const auth = (firebaseAuthInstance || createMockAuth()) as Auth;
export const db = (firebaseDBInstance || createMockDB()) as Firestore;

// Helper function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return firebaseAppInstance !== null && firebaseAuthInstance !== null && firebaseDBInstance !== null;
};

// Helper function to get Firebase status
export const getFirebaseStatus = (): {
  isAvailable: boolean;
  missingKeys: string[];
  appInitialized: boolean;
} => {
  return {
    isAvailable: isFirebaseAvailable(),
    missingKeys: missingConfigKeys,
    appInitialized: firebaseAppInstance !== null,
  };
};
