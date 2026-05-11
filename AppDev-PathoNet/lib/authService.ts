/**
 * Firebase Authentication Service
 * 
 * Provides reusable auth functions without email verification
 * Firebase SDK: v9+ (modular)
 * Tech Stack: React Native + Expo + Firebase
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  User,
  AuthError,
  signInWithCustomToken,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Type Definitions ─────────────────────────────────────────────────────

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email?: string | null;
  username?: string;
  createdAt: Timestamp;
  profileComplete: boolean;
  isAnonymous: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: AuthError;
}

// ─── METHOD 1: Email/Password Sign Up (No Verification) ───────────────────

/**
 * Sign up with email/password
 * No verification email sent. User gains immediate access.
 * 
 * @param email - User email
 * @param password - User password (min 6 chars)
 * @param username - Optional username for profile
 * @returns AuthResponse with user data or error
 */
export async function emailPasswordSignUp(
  email: string,
  password: string,
  username?: string,
): Promise<AuthResponse> {
  try {
    // 1. Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    const user = userCredential.user;

    // 2. Create user profile in Firestore (no verification field needed)
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      username: username || `user_${user.uid.slice(0, 6)}`,
      createdAt: serverTimestamp() as Timestamp,
      profileComplete: !!username,
      isAnonymous: false,
    };

    await setDoc(doc(db, "users", user.uid), userProfile);

    // 3. Store UID for offline access
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[Auth] User signed up successfully:", user.uid);

    return { success: true, user };
  } catch (error: any) {
    console.error("[Auth] Sign up error:", error);
    return {
      success: false,
      message: formatAuthError(error.code),
      error,
    };
  }
}

// ─── METHOD 2: Email/Password Sign In ───────────────────────────────────

/**
 * Sign in with email/password
 * No verification required. Logs in user immediately.
 * 
 * @param email - User email
 * @param password - User password
 * @returns AuthResponse with user data or error
 */
export async function emailPasswordSignIn(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    const user = userCredential.user;

    // Store UID for offline access
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[Auth] User signed in successfully:", user.uid);

    return { success: true, user };
  } catch (error: any) {
    console.error("[Auth] Sign in error:", error);
    return {
      success: false,
      message: formatAuthError(error.code),
      error,
    };
  }
}

// ─── METHOD 3: Anonymous Sign In (For Guest Access) ──────────────────────

/**
 * Sign in anonymously
 * Perfect for guest/trial access before registration
 * No credentials needed. User can upgrade to permanent account later.
 * 
 * @returns AuthResponse with anonymous user data
 */
export async function anonymousSignIn(): Promise<AuthResponse> {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;

    // Create anonymous user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: null,
      username: `guest_${user.uid.slice(0, 8)}`,
      createdAt: serverTimestamp() as Timestamp,
      profileComplete: false,
      isAnonymous: true,
    };

    await setDoc(doc(db, "users", user.uid), userProfile);

    // Store UID for offline access
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[Auth] Anonymous user signed in:", user.uid);

    return { success: true, user };
  } catch (error: any) {
    console.error("[Auth] Anonymous sign in error:", error);
    return {
      success: false,
      message: "Failed to sign in anonymously",
      error,
    };
  }
}

// ─── METHOD 4: Custom Token Sign In (Backend Integration) ────────────────

/**
 * Sign in with custom token
 * Use when you have a backend that generates tokens.
 * Allows server-side control of authentication.
 * 
 * Backend example (Node.js):
 * ```
 * const admin = require('firebase-admin');
 * const customToken = await admin.auth().createCustomToken(uid);
 * // Send token to client
 * ```
 * 
 * @param customToken - Token generated by Firebase Admin SDK
 * @returns AuthResponse with user data
 */
export async function customTokenSignIn(
  customToken: string,
): Promise<AuthResponse> {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    const user = userCredential.user;

    // Fetch or create user profile
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || undefined,
      createdAt: serverTimestamp() as Timestamp,
      profileComplete: true,
      isAnonymous: false,
    };

    await setDoc(doc(db, "users", user.uid), userProfile, { merge: true });

    // Store UID
    await AsyncStorage.setItem("pathonet_uid", user.uid);

    console.log("[Auth] Custom token sign in successful:", user.uid);

    return { success: true, user };
  } catch (error: any) {
    console.error("[Auth] Custom token error:", error);
    return {
      success: false,
      message: "Custom token authentication failed",
      error,
    };
  }
}

// ─── METHOD 5: Sign Out ───────────────────────────────────────────────────

/**
 * Sign out current user
 * Clears local session data and Firebase auth state
 * 
 * @returns AuthResponse indicating success/failure
 */
export async function signOutUser(): Promise<AuthResponse> {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem("pathonet_uid");
    console.log("[Auth] User signed out");
    return { success: true, message: "Signed out successfully" };
  } catch (error: any) {
    console.error("[Auth] Sign out error:", error);
    return {
      success: false,
      message: "Sign out failed",
      error,
    };
  }
}

// ─── Error Handling ──────────────────────────────────────────────────────

/**
 * Format Firebase error codes to user-friendly messages
 * 
 * @param errorCode - Firebase error code (e.g., "auth/user-not-found")
 * @returns User-friendly error message
 */
export function formatAuthError(errorCode: string): string {
  const errorMap: Record<string, string> = {
    "auth/email-already-in-use": "This email is already registered. Try signing in.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many failed attempts. Try again later.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/operation-not-allowed": "Email/password signup is disabled.",
    "auth/invalid-custom-token": "Invalid authentication token.",
    "auth/custom-token-mismatch": "Token doesn't match this app's credentials.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };

  return errorMap[errorCode] || "Authentication failed. Please try again.";
}

// ─── Helper: Get Current User ────────────────────────────────────────────

/**
 * Get currently authenticated user
 * 
 * @returns Current User object or null
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

// ─── Helper: Get User UID from Storage ──────────────────────────────────

/**
 * Get user UID from AsyncStorage (for offline use)
 * 
 * @returns User UID or null
 */
export async function getUserUIDFromStorage(): Promise<string | null> {
  try {
    const uid = await AsyncStorage.getItem("pathonet_uid");
    return uid;
  } catch (error) {
    console.error("[Auth] Failed to retrieve UID from storage:", error);
    return null;
  }
}

export default {
  emailPasswordSignUp,
  emailPasswordSignIn,
  anonymousSignIn,
  customTokenSignIn,
  signOutUser,
  getCurrentUser,
  getUserUIDFromStorage,
  formatAuthError,
};
