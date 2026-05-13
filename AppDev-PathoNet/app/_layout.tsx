import { useEffect } from "react";
import { Stack } from "expo-router";
import { logEnvironmentInfo } from "@/lib/debug";
import ErrorBoundary from './_error-boundary';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
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
