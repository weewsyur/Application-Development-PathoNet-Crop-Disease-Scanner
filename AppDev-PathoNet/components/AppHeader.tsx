import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
// ── NEW: import Ionicons from @expo/vector-icons ──────────────────────────────
import { Ionicons } from "@expo/vector-icons";
// ── NEW: import useRouter from expo-router for navigation ─────────────────────
import { useRouter } from "expo-router";
import { COLORS, SIZES } from "@/constants/theme";

const AppHeader = React.memo(function AppHeader({ title = "PATHONET" }: { title?: string }) {
  // ── NEW: initialize the Expo Router hook for navigation ──────────────────
  const router = useRouter();

  // ── NEW: navigate to the Profile screen when the icon is pressed ─────────
  const handleProfilePress = useCallback(() => {
    router.push("/Profile");
  }, [router]);

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>

      {/* ── NEW: Profile icon button replaces the old BellIcon ───────────── */}
      <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
        <Ionicons name="person-circle-outline" size={30} color={COLORS.white} />
      </TouchableOpacity>
      {/* ──────────────────────────────────────────────────────────────────── */}
    </View>
  );
});

export default AppHeader;

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  // ── NEW: button wrapper for the profile icon ──────────────────────────────
  profileBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
