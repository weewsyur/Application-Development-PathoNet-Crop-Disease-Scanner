import { useEffect, useState, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/storage";
import { initializeAsyncStorage } from "@/lib/storage";
import { useFonts } from "expo-font";
import { logEnvironmentInfo, logError } from "@/lib/debug";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const authInitializedRef = useRef(false);

  // Load fonts for web
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here if needed
    // Expo automatically loads system fonts and @expo/vector-icons
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
  if (!fontsLoaded || !isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
