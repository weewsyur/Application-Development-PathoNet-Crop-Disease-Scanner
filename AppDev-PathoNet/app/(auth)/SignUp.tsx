import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES } from "@/constants/theme";
import { STORAGE_KEYS } from "@/lib/storage";

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },

  // Decorative blobs
  blob: {
    position: "absolute",
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.primaryLighter,
  },
  blobTopLeft: {
    width: 500,
    height: 500,
    top: 1,
    left: 120,
    opacity: 0.6,
  },
  blobBottomRight: {
    width: 144,
    height: 144,
    bottom: -40,
    right: -40,
    opacity: 0.3,
  },
  blobMidLeft: {
    width: 350,
    height: 350,
    top: -195,
    right: 95,
    opacity: 0.4,
  },

  // Top area
  topArea: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.md,
  },
  eyebrow: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: SIZES.xs,
  },
  heroTitle: {
    fontSize: SIZES.fontDisplay,
    fontWeight: "700",
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },

  // Card
  card: {
    flex: 2.8,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    paddingTop: SIZES.xxl,
    paddingHorizontal: SIZES.xl,
    paddingBottom: SIZES.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: SIZES.fontXxl,
    fontWeight: "700",
    color: COLORS.textDark,
    letterSpacing: -0.4,
    marginBottom: SIZES.md,
  },

  // Input
  inputGroup: {
    marginBottom: SIZES.lg,
  },
  inputLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: "600",
    color: COLORS.textMid,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: SIZES.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    fontSize: SIZES.font,
    color: COLORS.textDark,
    paddingVertical: SIZES.sm,
  },
  passwordToggle: {
    paddingHorizontal: SIZES.sm,
  },
  toggleText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Error
  errorText: {
    fontSize: SIZES.fontSm,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: SIZES.md,
  },

  // Primary button
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.lg,
    alignItems: "center",
    width: "100%",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.font,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Auth Mode Toggle
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.inputBg,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xs,
    marginBottom: SIZES.xl,
    alignItems: "center",
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: SIZES.font,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },

  // Forgot password
  forgotWrapper: {
    alignItems: "flex-end",
    marginBottom: SIZES.lg,
  },
  forgotText: {
    fontSize: SIZES.fontSm,
    fontWeight: "500",
    color: COLORS.primary,
  },

  // Verification Banner
  verificationBanner: {
    backgroundColor: COLORS.primaryLighter,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    marginBottom: SIZES.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  verificationBannerText: {
    fontSize: SIZES.font,
    color: COLORS.textDark,
    textAlign: "center",
    marginBottom: SIZES.md,
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.md,
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: SIZES.font,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: SIZES.sm,
  },
  resendButtonText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  resendButtonTextDisabled: {
    color: COLORS.textLight,
  },

  // Switch link
  switchWrapper: {
    marginTop: SIZES.xl,
    alignItems: "center",
  },
  switchText: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
  },
  switchLink: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});

// ─── Reusable: AuthInput ──────────────────────────────────────────────────────

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureEntry?: boolean;
  keyboardType?: "default" | "email-address";
};

function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry = false,
  keyboardType = "default",
}: AuthInputProps) {
  const [secure, setSecure] = useState(secureEntry);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          secureTextEntry={secure}
          autoCapitalize="none"
          keyboardType={keyboardType}
        />
        {secureEntry && (
          <TouchableOpacity onPress={() => setSecure((s) => !s)} style={styles.passwordToggle}>
            <Text style={styles.toggleText}>{secure ? "Show" : "Hide"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Reusable: PrimaryButton ──────────────────────────────────────────────────

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
};

function PrimaryButton({ title, onPress }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={styles.primaryButton}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// ─── Reusable: AuthModeToggle ─────────────────────────────────────────────────

type AuthModeToggleProps = {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
};

function AuthModeToggle({ mode, onModeChange }: AuthModeToggleProps) {
  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          mode === "signin" && styles.toggleButtonActive,
        ]}
        onPress={() => onModeChange("signin")}
      >
        <Text
          style={[
            styles.toggleButtonText,
            mode === "signin" && styles.toggleButtonTextActive,
          ]}
        >
          Login
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleButton,
          mode === "signup" && styles.toggleButtonActive,
        ]}
        onPress={() => onModeChange("signup")}
      >
        <Text
          style={[
            styles.toggleButtonText,
            mode === "signup" && styles.toggleButtonTextActive,
          ]}
        >
          Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen: SignUp ───────────────────────────────────────────────────────────

export default function SignUp() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ─── Sign In Handler (No Verification Required) ──────────────────────────
  const handleSignIn = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = userCredential.user;

      // Store UID locally
      await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, user.uid);
      console.log("[SignIn] User signed in:", user.uid);

      // Navigate to home
      router.replace("/(tabs)/Home");
    } catch (e: any) {
      const errorCode = e.code;
      if (errorCode === "auth/user-not-found") {
        setError("❌ No account found with this email.");
      } else if (errorCode === "auth/wrong-password") {
        setError("❌ Incorrect password.");
      } else if (errorCode === "auth/invalid-email") {
        setError("❌ Invalid email address.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("❌ Too many failed attempts. Try again later.");
      } else {
        setError("❌ Sign in failed: " + (e.message || "Please try again."));
      }
      console.error("[SignIn] Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Sign Up Handler (Direct Access - No Email Verification) ─────────────
  const handleSignUp = async () => {
    setError("");

    // Validation
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const user = userCredential.user;
      console.log("[SignUp] User created:", user.uid);

      // 2. Save user profile to Firestore (directly accessible, no verification needed)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: username.trim(),
        createdAt: serverTimestamp(),
        // Remove emailVerified flag - not needed
        profileComplete: false,
        lastUpdated: serverTimestamp(),
      });
      console.log("[SignUp] User profile saved to Firestore");

      // 3. Store UID locally for quick access
      await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, user.uid);

      // 4. Navigate directly to home (no verification screen)
      Alert.alert("Success!", `Welcome ${username}! You're all set.`, [
        {
          text: "OK",
          onPress: () => router.replace("/(tabs)/Home"),
        },
      ]);
    } catch (e: any) {
      console.error("[SignUp] Error:", e);
      const errorCode = e.code;

      if (errorCode === "auth/email-already-in-use") {
        setError(
          "❌ This email is already registered. Try signing in instead.",
        );
      } else if (errorCode === "auth/weak-password") {
        setError("❌ Password must be at least 6 characters.");
      } else if (errorCode === "auth/invalid-email") {
        setError("❌ Please enter a valid email address.");
      } else if (errorCode === "auth/operation-not-allowed") {
        setError("❌ Email/password signup is disabled. Contact support.");
      } else {
        setError("❌ Signup failed: " + (e.message || "Please try again."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />
      <View style={[styles.blob, styles.blobMidLeft]} />

      {/* Top area */}
      <View style={styles.topArea}>
        <Text style={styles.eyebrow}>
          {mode === "signin" ? "Welcome back" : "Get started"}
        </Text>
        <Text style={styles.heroTitle}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Auth Mode Toggle */}
          <AuthModeToggle mode={mode} onModeChange={setMode} />

          <Text style={styles.cardTitle}>
            {mode === "signin" ? "Login" : "Register"}
          </Text>

          {/* Username field - only during sign-up */}
          {mode === "signup" && (
            <AuthInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
            />
          )}

          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
          />

          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry
          />

          {mode === "signup" && (
            <AuthInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureEntry
            />
          )}

          {mode === "signin" && (
            <TouchableOpacity style={styles.forgotWrapper}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Single button - no verification banner needed */}
          <PrimaryButton
            title={mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            onPress={mode === "signin" ? handleSignIn : handleSignUp}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
