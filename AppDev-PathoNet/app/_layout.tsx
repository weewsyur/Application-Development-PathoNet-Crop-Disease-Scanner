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
import * as Font from 'expo-font';
import ErrorBoundary from './_error-boundary';
import LoadingFallback from './_loading-fallback';
import { useMobileDetector } from './_mobile-detector';
import { useMobileViewport } from './_mobile-viewport';
import MobileContainer from './_mobile-container';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const authInitializedRef = useRef(false);
  const { isMobile, screenSize } = useMobileDetector();

  // Initialize mobile viewport
  useMobileViewport();

  // Load fonts for web - using CDN approach
  const [fontsLoaded] = useFonts({
    // Load Ionicons from CDN for web
    Ionicons: "https://cdn.jsdelivr.net/npm/@expo/vector-icons@13.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf",
    // Load MaterialIcons from CDN for web
    MaterialIcons: "https://cdn.jsdelivr.net/npm/@expo/vector-icons@13.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf",
    // Load MaterialCommunityIcons from CDN for web
    MaterialCommunityIcons: "https://cdn.jsdelivr.net/npm/@expo/vector-icons@13.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf",
  });

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
        // Listen to Firebase auth state
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user && user.emailVerified) {
            // User is signed in and email verified, go to Home
            await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, user.uid);
            router.replace("/(tabs)/Home");
          }
          // Otherwise, let the user stay on Welcome screen (default route)
          setIsReady(true);
        });

        return unsubscribe;
      } catch (error) {
        logError(error, "RootLayout auth check");
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
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [isReady]);

  const shouldWait = Platform.OS !== 'web' ? !fontsLoaded : true;
  if ((shouldWait || !isReady) && !loadingTimeout) {
    return <LoadingFallback message="Preparing app..." />;
  }

  return (
    <ErrorBoundary>
      <MobileContainer>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </MobileContainer>
    </ErrorBoundary>
  );
}
