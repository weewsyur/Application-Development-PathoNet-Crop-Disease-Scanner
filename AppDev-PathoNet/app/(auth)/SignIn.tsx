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
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES } from "@/constants/theme";
import { STORAGE_KEYS } from "@/lib/storage";

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
  const signinButtonStyle = StyleSheet.flatten([
    styles.toggleButton,
    mode === "signin" && styles.toggleButtonActive,
  ]);
  const signinTextStyle = StyleSheet.flatten([
    styles.toggleButtonText,
    mode === "signin" && styles.toggleButtonTextActive,
  ]);
  const signupButtonStyle = StyleSheet.flatten([
    styles.toggleButton,
    mode === "signup" && styles.toggleButtonActive,
  ]);
  const signupTextStyle = StyleSheet.flatten([
    styles.toggleButtonText,
    mode === "signup" && styles.toggleButtonTextActive,
  ]);

  return (
    <View style={styles.toggleContainer}>
      <TouchableOpacity
        style={signinButtonStyle}
        onPress={() => onModeChange("signin")}
      >
        <Text style={signinTextStyle}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={signupButtonStyle}
        onPress={() => onModeChange("signup")}
      >
        <Text style={signupTextStyle}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      // Store UID in AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_UID, user.uid);
      console.log("[SignIn] User signed in successfully:", user.uid);

      // Navigate to home (no verification needed)
      router.replace("/(tabs)/Home");
    } catch (e: any) {
      console.error("[SignIn] Error:", e);
      const errorCode = e.code;

      if (errorCode === "auth/user-not-found") {
        setError("❌ No account found with this email. Please sign up first.");
      } else if (errorCode === "auth/wrong-password") {
        setError("❌ Incorrect password. Please try again.");
      } else if (errorCode === "auth/invalid-credential") {
        setError("❌ Invalid email or password.");
      } else if (errorCode === "auth/invalid-email") {
        setError("❌ Invalid email format.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("⏱️ Too many failed attempts. Try again later.");
      } else if (errorCode === "auth/user-disabled") {
        setError("🔒 This account has been disabled. Contact support.");
      } else if (errorCode === "auth/requires-recent-login") {
        setError("🔐 This operation requires recent authentication. Please sign in again.");
      } else if (errorCode && errorCode.includes("recaptcha")) {
        setError("🤖 reCAPTCHA verification failed. Please try again or check your network connection.");
      } else if (errorCode === "auth/captcha-check-failed") {
        setError("🤖 reCAPTCHA verification failed. Please try again.");
      } else {
        console.error("[SignIn] Unknown error code:", errorCode);
        setError(`❌ Sign in failed: ${errorCode || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    // Navigate to SignUp screen
    router.replace("/(auth)/SignUp");
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
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.heroTitle}>Sign in</Text>
      </View>

      {/* Card */}
      <View style={styles.card}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.cardTitle}>Login</Text>

          <AuthModeToggle
            mode="signin"
            onModeChange={(m) => {
              if (m === "signup") router.replace("/(auth)/SignUp");
            }}
          />

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

          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            title={isLoading ? "Signing in..." : "SIGN IN"}
            onPress={handleSignIn}
          />

          {/* Sign up link */}
          <View style={styles.switchWrapper}>
            <Text style={styles.switchText}>
              Don't have an account?{" "}
              <Text style={styles.switchLink} onPress={handleSignUp}>
                Sign up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}



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
    flex: 2.4,
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
