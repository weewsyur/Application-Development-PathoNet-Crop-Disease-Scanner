/**
 * components/UserProfileBadge.tsx
 *
 * Reusable circular avatar that shows the first letter of the authenticated
 * user's display name (or email prefix). Falls back to "G" (Guest) and a
 * person-circle-outline Ionicon when no user is signed in.
 *
 * Props
 * ─────
 *  size      – diameter of the circle (default 38)
 *  onPress   – optional tap handler (e.g. navigate to profile screen)
 *  style     – optional extra ViewStyle overrides
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { COLORS } from "@/constants/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfileBadgeProps {
  /** Circle diameter in pixels. Default: 38 */
  size?: number;
  /** Called when the badge is tapped. */
  onPress?: () => void;
  /** Additional styles applied to the outermost container. */
  style?: ViewStyle;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a display-friendly name from the Firebase user object.
 * Returns null when no user is signed in.
 */
function deriveInitial(displayName: string | null, email: string | null): string {
  const name = displayName || email?.split("@")[0] || null;
  return name ? name.charAt(0).toUpperCase() : "G";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UserProfileBadge = React.memo(function UserProfileBadge({
  size = 38,
  onPress,
  style,
}: UserProfileBadgeProps) {
  const [initial, setInitial] = useState<string>("G");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Real-time auth listener — updates badge whenever sign-in state changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setInitial(deriveInitial(user.displayName, user.email));
        setIsAuthenticated(true);
      } else {
        setInitial("G");
        setIsAuthenticated(false);
      }
    });
    return unsubscribe; // cleanup on unmount
  }, []);

  // Derived style values that depend on the `size` prop.
  const circleStyle = useMemo<ViewStyle>(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
  }), [size]);

  const fontSize = useMemo(() => Math.round(size * 0.38), [size]); // ~38 % of diameter looks good
  const iconSize = useMemo(() => Math.round(size * 0.45), [size]);

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = useMemo(() =>
    onPress ? { onPress, activeOpacity: 0.75 } : {}, [onPress]);

  return (
    <Wrapper
      {...wrapperProps}
      style={[styles.wrapper, circleStyle, style]}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={
        isAuthenticated ? `Profile: ${initial}` : "Guest profile"
      }
    >
      {isAuthenticated ? (
        /* ── Authenticated: coloured circle with initial ─────────────────── */
        <Text style={[styles.initialText, { fontSize }]}>{initial}</Text>
      ) : (
        /* ── Guest: neutral circle with person icon ──────────────────────── */
        <Ionicons
          name="person-circle-outline"
          size={iconSize}
          color={COLORS.white}
        />
      )}

      {/* Small "online" dot to indicate signed-in state */}
      {isAuthenticated && (
        <View style={[styles.statusDot, { bottom: 0, right: 0 }]} />
      )}
    </Wrapper>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    // Subtle shadow so it lifts off any background.
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    // Relative positioning lets the status dot sit inside via absolute.
    position: "relative",
    overflow: "visible",
  },
  initialText: {
    color: COLORS.white,
    fontWeight: "700",
    letterSpacing: 0.5,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  statusDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#34D399", // emerald-400 – universally understood as "online"
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
});

export default UserProfileBadge;