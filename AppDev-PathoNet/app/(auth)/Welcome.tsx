import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "@/constants/theme";

function LeafShape({ style }: { style: any }) {
  const flattenedStyle = StyleSheet.flatten([styles.leafShape, style]);
  return <View style={flattenedStyle} />;
}

// Pill button component
function PillButton({ title, href, variant = "primary", style }: any) {
  const buttonStyle =
    variant === "primary" ? styles.pillButtonPrimary : styles.pillButtonOutline;
  const textStyle =
    variant === "primary"
      ? styles.pillButtonTextPrimary
      : styles.pillButtonTextOutline;

  const flattenedStyle = StyleSheet.flatten([
    styles.pillButton,
    buttonStyle,
    style,
  ]);

  return (
    <Link href={href} asChild>
      <Pressable style={flattenedStyle}>
        <Text style={[styles.pillButtonText, textStyle]}>{title}</Text>
      </Pressable>
    </Link>
  );
}

function WelcomeScreen() {
  return (
    <View style={styles.welcomeContainer}>
      {/* Background gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Decorative leaf shapes */}
      <LeafShape style={styles.leafTopLeft} />
      <LeafShape style={styles.leafTopRight} />
      <LeafShape style={styles.leafBottomLeft} />
      <LeafShape style={styles.leafBottomRight} />

      {/* Content */}
      <View style={styles.welcomeContent}>
        {/* Logo placeholder */}
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={64} color={COLORS.primary} />
        </View>

        {/* Title and subtitle */}
        <Text style={styles.welcomeTitle}>Welcome to PathoNet</Text>
        <Text style={styles.welcomeSub}>
          Real-Time Crop Disease Detection and Management
        </Text>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <PillButton
            title="SIGN IN"
            href="./(auth)/SignIn"
            variant="primary"
            style={styles.btnFull}
          />
          <PillButton
            title="SIGN UP"
            href="./(auth)/SignUp"
            variant="outline"
            style={styles.btnFull}
          />
        </View>
      </View>
    </View>
  );
}

export default WelcomeScreen;

const styles = StyleSheet.create({
  leafShape: {
    position: "absolute",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 50,
    opacity: 0.6,
  },
  leafTopLeft: {
    width: 120,
    height: 120,
    top: -40,
    left: -40,
    transform: [{ rotate: "45deg" }],
  },
  leafTopRight: {
    width: 80,
    height: 80,
    top: 80,
    right: -30,
    transform: [{ rotate: "30deg" }],
    opacity: 0.4,
  },
  leafBottomLeft: {
    width: 100,
    height: 100,
    bottom: 60,
    left: -30,
    transform: [{ rotate: "-30deg" }],
    opacity: 0.5,
  },
  leafBottomRight: {
    width: 150,
    height: 150,
    bottom: -60,
    right: -50,
    transform: [{ rotate: "60deg" }],
  },

  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
  },

  welcomeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 24,
    zIndex: 1,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  welcomeSub: {
    fontSize: 16,
    fontWeight: "400",
    color: COLORS.textMid,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 280,
  },
  btnRow: {
    flexDirection: "column",
    width: "100%",
    gap: 12,
    marginTop: 16,
  },
  btnFull: {
    width: "100%",
  },

  pillButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: SIZES.radiusLg,
    alignItems: "center",
    justifyContent: "center",
  },
  pillButtonPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pillButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pillButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  pillButtonTextPrimary: {
    color: COLORS.white,
  },
  pillButtonTextOutline: {
    color: COLORS.primary,
  },
});
