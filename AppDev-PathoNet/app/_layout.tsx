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
  const router = useRouter();

  // Skip Firebase auth check for now to prevent loading screen hang
  // AuthProvider will handle auth state changes
  useEffect(() => {
    logEnvironmentInfo();
  }, []);

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
