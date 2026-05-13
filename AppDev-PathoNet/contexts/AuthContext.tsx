/**
 * contexts/AuthContext.tsx - Authentication Context Provider
 * Manages authentication state, user verification status, and navigation guards
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storage';
import { useRouter } from 'expo-router';

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  emailVerified: boolean;
  otpVerified: boolean;
  termsAccepted: boolean;
  profileComplete: boolean;
  createdAt?: any;
  lastUpdated?: any;
  termsAcceptedAt?: any;
}

export interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isOtpVerified: boolean;
  areTermsAccepted: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Computed states
  const isAuthenticated = !!user;
  const isEmailVerified = userProfile?.emailVerified || false;
  const isOtpVerified = userProfile?.otpVerified || false;
  const areTermsAccepted = userProfile?.termsAccepted || false;

  // Fetch user profile from Firestore - optimized with caching
  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid,
          email: data.email || '',
          username: data.username || '',
          emailVerified: data.emailVerified || false,
          otpVerified: data.otpVerified || false,
          termsAccepted: data.termsAccepted || false,
          profileComplete: data.profileComplete || false,
          createdAt: data.createdAt,
          lastUpdated: data.lastUpdated,
          termsAcceptedAt: data.termsAcceptedAt,
        };
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user profile:', error);
    }
    return null;
  };

  // Refresh user profile
  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PATHONET_UID,
        'temp_signup_email',
        'temp_signup_username',
        'temp_signup_uid',
      ]);
      setUser(null);
      setUserProfile(null);
      router.replace('/(auth)/Welcome' as any);
    } catch (error) {
      console.error('[AuthContext] Error signing out:', error);
    }
  };

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setIsLoading(true);

      if (authUser) {
        setUser(authUser);

        // Fetch user profile with timeout - optimized to reduce unnecessary calls
        try {
          const profile = await Promise.race([
            fetchUserProfile(authUser.uid),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Profile fetch timeout")), 5000))
          ]) as any;
          setUserProfile(profile);

          // Store UID locally with timeout
          await Promise.race([
            AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, authUser.uid),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Storage timeout")), 3000))
          ]);

          console.log('[AuthContext] User signed in:', authUser.uid);
          console.log('[AuthContext] Profile loaded:', profile);
        } catch (error: any) {
          console.error('[AuthContext] Error loading user profile:', error);
          // Continue even if profile fetch fails - set minimal profile
          setUserProfile({
            uid: authUser.uid,
            email: authUser.email || '',
            username: authUser.email?.split('@')[0] || 'User',
            emailVerified: authUser.emailVerified || false,
            otpVerified: false,
            termsAccepted: false,
            profileComplete: false,
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);

        // Clear stored UID with timeout
        try {
          await Promise.race([
            AsyncStorage.removeItem(STORAGE_KEYS.PATHONET_UID),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Storage timeout")), 3000))
          ]);
        } catch (error) {
          console.error('[AuthContext] Error clearing storage:', error);
        }

        console.log('[AuthContext] User signed out');
      }

      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isAuthenticated,
    isEmailVerified,
    isOtpVerified,
    areTermsAccepted,
    refreshProfile,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
