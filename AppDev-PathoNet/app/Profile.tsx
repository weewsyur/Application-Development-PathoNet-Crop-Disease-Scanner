import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, User, Info, LogOut } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { COLORS, SIZES } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, isLoading: authLoading, signOut } = useAuth();
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // ── Fetch username from Firebase Auth or Firestore ─────────────────────────────
  const fetchUserName = useCallback(async (uid: string) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser?.displayName) {
        setUserName(currentUser.displayName);
        setUserEmail(currentUser.email || "");
        return;
      }

      // Try Firestore username field
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData?.username || userData?.email?.split("@")[0] || "User";
        setUserName(username);
        setUserEmail(userData?.email || currentUser?.email || "");
      } else {
        // Fallback to email prefix
        setUserName(currentUser?.email?.split("@")[0] || "User");
        setUserEmail(currentUser?.email || "");
      }
    } catch (error) {
      console.error("[Profile] Error fetching username:", error);
      const currentUser = auth.currentUser;
      setUserName(currentUser?.email?.split("@")[0] || "User");
      setUserEmail(currentUser?.email || "");
    }
  }, []);

  // ── Use AuthContext instead of separate auth listener ───────────────────────────
  useEffect(() => {
    if (user) {
      // Use userProfile from AuthContext if available, otherwise fetch
      if (userProfile?.username) {
        setUserName(userProfile.username);
        setUserEmail(userProfile.email || user.email || "");
      } else {
        fetchUserName(user.uid);
      }
    } else if (!authLoading) {
      // Clear local state when user signs out
      setUserName("");
      setUserEmail("");
    }
  }, [user, userProfile, authLoading, fetchUserName]);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("[Profile] Starting sign out process...");
            setLoading(true);

            // Sign out using AuthContext (this handles Firebase auth and state updates)
            await signOut();

            console.log("[Profile] Sign out successful");

            // Clear local state immediately
            setUserName("");
            setUserEmail("");
          } catch (error) {
            console.error("[Profile] Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ChevronLeft size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
        </View>

        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={20} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Account Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{userName}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{userEmail}</Text>
            </View>
          </View>
        </View>

        {/* App Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Info
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.cardTitle}>About App</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Name</Text>
              <Text style={styles.infoValue}>PathoNet</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogout}
          disabled={loading}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.signOutText}>
            {loading ? "Signing Out..." : "Sign Out"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  backButtonPlaceholder: {
    width: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  content: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxxl,
    gap: SIZES.lg,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatar: {
    width: SIZES.xxxl,
    height: SIZES.xxxl,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SIZES.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: SIZES.fontXxxl,
    fontWeight: "700",
    color: COLORS.white,
  },
  userName: {
    fontSize: SIZES.fontXl,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: SIZES.xs,
  },
  userEmail: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: SIZES.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  cardContent: {
    gap: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: SIZES.fontSm,
    color: COLORS.textDark,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SIZES.sm,
    backgroundColor: COLORS.error + "15",
    borderRadius: SIZES.radiusLg,
    paddingVertical: SIZES.lg,
    marginTop: SIZES.sm,
    borderWidth: 1.5,
    borderColor: COLORS.error + "30",
  },
  signOutText: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.error,
  },
});
