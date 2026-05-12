import { useEffect, useState, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/storage";
import { initializeAsyncStorage } from "@/lib/storage";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const authInitializedRef = useRef(false);

  useEffect(() => {
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
        console.error("[RootLayout] Auth check error:", error);
        setIsReady(true);
      }
    };

    checkAuthState();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
