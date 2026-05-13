/**
 * lib/logoutHandler.ts - Centralized logout handler utility
 * Provides a reusable logout function that can be used across the app
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { STORAGE_KEYS } from "@/lib/storage";

export interface LogoutResponse {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Centralized logout handler
 * - Signs out from Firebase
 * - Clears AsyncStorage
 * - Returns success/failure response
 * 
 * Note: Navigation should be handled by AuthContext's onAuthStateChanged listener
 */
export async function handleLogout(): Promise<LogoutResponse> {
  try {
    console.log("[logoutHandler] Starting logout process...");

    // Check if auth is properly configured
    if (!auth || typeof auth.signOut !== 'function') {
      console.error("[logoutHandler] Firebase auth not properly configured");
      return {
        success: false,
        message: "Firebase auth not configured. Please check your environment variables.",
      };
    }

    // Sign out from Firebase
    await firebaseSignOut(auth);
    console.log("[logoutHandler] Firebase sign out completed");

    // Clear all relevant AsyncStorage keys
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PATHONET_UID,
      STORAGE_KEYS.PATHONET_USER_ID,
      STORAGE_KEYS.PATHONET_SESSION_ID,
      STORAGE_KEYS.SCAN_HISTORY,
      "temp_signup_email",
      "temp_signup_username",
      "temp_signup_uid",
    ]);
    console.log("[logoutHandler] AsyncStorage cleared");

    console.log("[logoutHandler] Logout successful");
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("[logoutHandler] Logout failed:", error);
    console.error("[logoutHandler] Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return {
      success: false,
      message: error?.message || "Logout failed",
      error,
    };
  }
}
