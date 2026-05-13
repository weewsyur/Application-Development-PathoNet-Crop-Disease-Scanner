import { useEffect, useState, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/storage";
import { initializeAsyncStorage } from "@/lib/storage";
import { useFonts } from "expo-font";
import { logEnvironmentInfo, logError } from "@/lib/debug";
import { Platform } from "react-native";
import ErrorBoundary from './_error-boundary';
import LoadingFallback from './_loading-fallback';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const authInitializedRef = useRef(false);

  // No font loading needed - using SVG icons

  useEffect(() => {
    // Log environment info for debugging
    logEnvironmentInfo();

    // Prevent multiple auth listener initializations
    if (authInitializedRef.current) {
      return;
    }
    authInitializedRef.current = true;

    const checkAuthState = async () => {
      await initializeAsyncStorage();
      try {
        console.log('[RootLayout] Initializing Firebase auth...');

        // Check Firebase availability first
        const { isFirebaseAvailable, missingKeys } = require('@/lib/firebase').getFirebaseStatus();

        if (!isFirebaseAvailable) {
          console.warn('[RootLayout] Firebase not available, missing keys:', missingKeys);
          setIsReady(true);
          return;
        }

        // Listen to Firebase auth state
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log('[RootLayout] Auth state changed:', user ? `User: ${user.email}` : 'No user');

          if (user) {
            // User is signed in, store UID and let AuthProvider handle routing
            await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, user.uid);
            setIsReady(true);
          } else {
            // No user, let them stay on Welcome screen (default route)
            setIsReady(true);
          }
        });

        // Set a timeout to prevent infinite loading
        const authTimeout = setTimeout(() => {
          console.warn('[RootLayout] Auth initialization timeout - proceeding without auth');
          setIsReady(true);
        }, 1500);

        return () => {
          unsubscribe();
          clearTimeout(authTimeout);
        };
      } catch (error) {
        logError(error, "RootLayout auth check");
        console.error('[RootLayout] Auth check failed:', error);
        setIsReady(true);
      }
    };

    checkAuthState();
  }, []);

  // Don't render until fonts are loaded and auth is checked
  // Add timeout to prevent infinite loading on different devices
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isReady) {
        console.warn('[RootLayout] Loading timeout - forcing render');
        setLoadingTimeout(true);
      }
    }, 2000); // 2 second timeout for faster debugging

    return () => clearTimeout(timer);
  }, [isReady]);

  // Remove mobile-only restrictions - work on all devices
  if (!isReady && !loadingTimeout) {
    return <LoadingFallback message="Preparing app..." />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}
