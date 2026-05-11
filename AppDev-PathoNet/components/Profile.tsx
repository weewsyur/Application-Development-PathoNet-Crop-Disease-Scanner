import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { signOutUser } from "@/lib/authService";

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Placeholder user data — replace with real data from auth/context/API
  const [user] = useState({
    username: "johndoe",
    email: "john.doe@example.com",
    joinDate: "April 2025",
    role: "Member",
  });

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const result = await signOutUser();
            if (result.success) {
              router.replace("/(auth)/Welcome");
            } else {
              Alert.alert("Error", result.message || "Failed to sign out");
            }
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* ── Header — matches AppHeader background color ─────────────────── */}
      <View style={styles.header}>
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={C.white} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* Spacer to keep title centered */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar circle ─────────────────────────────────────────────── */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={52} color={C.white} />
          </View>
          {/* Green "active" badge */}
          <View style={styles.activeBadge} />
        </View>

        {/* ── Display name & role tag ────────────────────────────────────── */}
        <Text style={styles.displayName}>@{user.username}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{user.role}</Text>
        </View>

        {/* ── Info card ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Account Info</Text>

          <InfoRow icon="person-outline" label="Username" value={user.username} />
          <InfoRow icon="mail-outline" label="Email" value={user.email} />
          <InfoRow icon="calendar-outline" label="Member since" value={user.joinDate} />
        </View>

        {/* ── Action buttons ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Settings</Text>

          <ActionRow icon="create-outline" label="Edit Profile" />
          <ActionRow icon="lock-closed-outline" label="Change Password" />
          <ActionRow icon="notifications-outline" label="Notifications" />
        </View>

        {/* ── Sign out button ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.82}
          onPress={handleSignOut}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={18} color={C.white} />
          <Text style={styles.signOutText}>{loading ? "Signing Out..." : "Sign Out"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Reusable: InfoRow ─────────────────────────────────────────────────────────
// Displays a labelled piece of user info with an icon

type InfoRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
};

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIconWrapper}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Reusable: ActionRow ───────────────────────────────────────────────────────
// A tappable settings-style row

type ActionRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
};

function ActionRow({ icon, label, onPress }: ActionRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIconWrapper}>
        <Ionicons name={icon} size={18} color={C.primary} />
      </View>
      <Text style={[styles.rowValue, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Design Tokens — kept in sync with sign-up.tsx ────────────────────────────

const C = {
  primary: "#61E26D",        // same green accent
  white: "#FFFFFF",
  textDark: "#1A0808",
  textMuted: "#9A7070",
  beige: "#F5F1E8",
  cardBg: "#FFFFFF",
  inputBorder: "#EAD8D8",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.beige,
  },

  // Header — uses COLORS.headerBg to stay consistent with AppHeader
  header: {
    backgroundColor: COLORS.headerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 18,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 1.2,
  },

  // Scrollable content
  content: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // Avatar
  avatarWrapper: {
    marginTop: 32,
    marginBottom: 12,
    position: "relative",
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.headerBg,  // matches header
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  activeBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.primary,
    borderWidth: 2,
    borderColor: C.white,
  },

  // Name & role
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    color: C.textDark,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  roleTag: {
    backgroundColor: C.primary,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 28,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Card
  card: {
    width: "100%",
    backgroundColor: C.cardBg,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeading: {
    fontSize: 10,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Row (shared by InfoRow & ActionRow)
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.inputBorder,
  },
  rowIconWrapper: {
    width: 32,
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    marginLeft: 8,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 14,
    color: C.textDark,
    fontWeight: "500",
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: "#FF6B6B",
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 32,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.white,
    letterSpacing: 0.8,
  },
});