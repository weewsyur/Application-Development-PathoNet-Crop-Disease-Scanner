import React from 'react';
import { StatusBar } from 'react-native';

/**
 * App.tsx - Entry Point
 * 
 * NOTE: This project uses Expo Router (file-based routing).
 * Navigation is handled through the file structure:
 * - app/_layout.tsx - Root layout
 * - app/(tabs)/_layout.tsx - Tab navigation
 * - app/(auth)/ - Auth screens
 * 
 * DO NOT add custom NavigationContainer here - it conflicts with Expo Router's
 * internal navigation and causes Component Stack errors.
 */

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#5DE05D" />
    </>
  );
}