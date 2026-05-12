/**
 * app/(tabs)/Home.tsx — Real-Time Analytics Dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 * Features:
 * • Real-time Firestore sync with onSnapshot
 * • AsyncStorage fallback for offline support
 * • Analytics summary cards (Total, Healthy, Diseased, Avg Confidence)
 * • Recent scans feed with FlatList
 * • Pull-to-refresh functionality
 * • Empty state handling
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { Sun, Moon, Leaf, TrendingUp, User, Scan, Bug, BarChart3 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { onSnapshot, collection, query, orderBy, limit, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import { UserProfileBadge } from "@/components/UserProfileBadge";
import { COLORS, SIZES } from "@/constants/theme";
import { CATEGORY_COLOR } from "@/constants/categoryColors";
import type { ScanRecord } from "./Scan";
import { STORAGE_KEYS } from "@/lib/storage";

// ─── Type Definitions ────────────────────────────────────────────────────────────

type TimeOfDay = "Morning" | "Afternoon" | "Evening";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
};

const TIME_ICONS: Record<TimeOfDay, React.ReactNode> = {
  Morning: <Sun />,
  Afternoon: <Sun />,
  Evening: <Moon />,
};

const TIME_ICON_COLORS: Record<TimeOfDay, string> = {
  Morning: "#F59E0B",
  Afternoon: "#F97316",
  Evening: "#818CF8",
};

const CATEGORY_BG: Record<string, string> = {
  healthy: "#f0fdf4",
  fungal: "#fffbeb",
  bacterial: "#fef2f2",
  viral: "#f5f3ff",
  pest: "#ecfeff",
};

const formatDate = (iso: string): string => {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Unknown";
  }
};

// ─── Components ───────────────────────────────────────────────────────────────────

interface AnalyticsSummaryProps {
  total: number;
  healthy: number;
  diseased: number;
  avgConfidence: number;
}

const AnalyticsSummary = React.memo(function AnalyticsSummary({ total, healthy, diseased, avgConfidence }: AnalyticsSummaryProps) {
  const stats = useMemo(() => [
    { icon: <Scan size={20} />, label: "Total Scans", value: total.toString(), color: "#3b82f6" },
    { icon: <Bug size={20} />, label: "Diseases Found", value: diseased.toString(), color: "#ef4444" },
    { icon: <Leaf size={20} />, label: "Healthy Crops", value: healthy.toString(), color: "#22c55e" },
    { icon: <BarChart3 size={20} />, label: "Avg Confidence", value: total > 0 ? `${(avgConfidence * 100).toFixed(1)}%` : "—", color: "#f59e0b" },
  ], [total, healthy, diseased, avgConfidence]);

  return (
    <View style={summaryStyles.grid}>
      {stats.map((stat, index) => (
        <View key={index} style={summaryStyles.card}>
          <View style={[summaryStyles.iconWrapper, { backgroundColor: stat.color + "15" }]}>
            {stat.icon}
          </View>
          <Text style={summaryStyles.value}>{stat.value}</Text>
          <Text style={summaryStyles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
});

interface FeedCardProps {
  item: ScanRecord;
  onPress: () => void;
}

const FeedCard = React.memo(function FeedCard({ item, onPress }: FeedCardProps) {
  const isHealthy = item.category === "healthy";
  const categoryColor = CATEGORY_COLOR[item.category] || "#6b7280";
  const categoryBg = CATEGORY_BG[item.category] || "#f3f4f6";

  return (
    <TouchableOpacity style={feedCardStyles.card} onPress={onPress} activeOpacity={0.85}>
      {item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={feedCardStyles.image} resizeMode="cover" />
      )}
      <View style={feedCardStyles.content}>
        <View style={feedCardStyles.header}>
          <Text style={feedCardStyles.title} numberOfLines={1}>
            {item.scanName || item.label}
          </Text>
          <View style={[feedCardStyles.badge, { backgroundColor: categoryBg }]}>
            <Text style={[feedCardStyles.badgeText, { color: categoryColor }]}>
              {isHealthy ? "Healthy" : item.category}
            </Text>
          </View>
        </View>
        <Text style={feedCardStyles.label} numberOfLines={1}>{item.label}</Text>
        {item.scanDescription && (
          <Text style={feedCardStyles.description} numberOfLines={2}>
            {item.scanDescription}
          </Text>
        )}
        <View style={feedCardStyles.footer}>
          <Text style={feedCardStyles.timestamp}>{formatDate(item.timestamp || "")}</Text>
          <Text style={[feedCardStyles.confidence, { color: categoryColor }]}>
            {`${Math.round((item.confidence || 0) * 100)}% confidence`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

interface ScanFeedProps {
  data: ScanRecord[];
  onRefresh: () => void;
  refreshing: boolean;
}

function ScanFeed({ data, onRefresh, refreshing }: ScanFeedProps) {
  const router = useRouter();

  const handlePress = (item: ScanRecord) => {
    router.push("/(tabs)/Analytics");
  };

  const renderItem = useCallback(({ item }: { item: ScanRecord }) => {
    return <FeedCard item={item} onPress={() => handlePress(item)} />;
  }, [router]);

  const keyExtractor = useCallback((item: ScanRecord, index: number) => {
    return item.timestamp || index.toString();
  }, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={feedCardStyles.emptyState}>
      <Leaf size={48} color={COLORS.textLight} />
      <Text style={feedCardStyles.emptyText}>No scans yet</Text>
      <Text style={feedCardStyles.emptySubtext}>Start scanning plants to see your feed</Text>
    </View>
  ), []);

  return (
    <View style={feedCardStyles.container}>
      <View style={feedCardStyles.header}>
        <Text style={feedCardStyles.headerTitle}>Recent Scans</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/History")}>
          <Text style={feedCardStyles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={data.length === 0 ? feedCardStyles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState<string>("");
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);

  // ── Fetch username from Firebase Auth or Firestore ─────────────────────────────
  const fetchUserName = useCallback(async (uid: string) => {
    try {
      // First try Firebase Auth displayName
      const user = auth.currentUser;
      if (user?.displayName) {
        setUserName(user.displayName);
        return;
      }

      // Then try Firestore username field
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const username = userData?.username || userData?.email?.split("@")[0] || "User";
        setUserName(username);
      } else {
        // Fallback to email prefix
        setUserName(user?.email?.split("@")[0] || "User");
      }
    } catch (error) {
      console.error("[Home] Error fetching username:", error);
      const currentUser = auth.currentUser;
      setUserName(currentUser?.email?.split("@")[0] || "User");
    }
  }, []);

  // ── Auth state listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserName(user.uid);
      } else {
        setUserName(""); // Clear username when signed out
      }
    });

    authUnsubscribeRef.current = unsubscribe;

    return () => {
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
      }
    };
  }, [fetchUserName]);

  // ── Load from AsyncStorage (initial load) ───────────────────────────────────────
  const loadFromStorage = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      if (raw) {
        const data: ScanRecord[] = JSON.parse(raw);
        // Sort by timestamp descending and limit to 10
        const sorted = data
          .sort((a, b) => {
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 10);
        setScans(sorted);
      }
    } catch (e) {
      console.error("[Home] loadFromStorage error:", e);
    }
  };

  // ── Real-time Firestore Sync ────────────────────────────────────────────────────
  useEffect(() => {
    const setupFirestoreListener = async () => {
      const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
      if (!uid) {
        loadFromStorage();
        return;
      }

      // Set up real-time listener with limit to improve performance
      const q = query(collection(db, "users", uid, "scans"), orderBy("timestamp", "desc"), limit(50));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const firestoreData: ScanRecord[] = [];
        snapshot.forEach((doc) => {
          firestoreData.push(doc.data() as ScanRecord);
        });

        // Merge with AsyncStorage
        AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY).then((raw) => {
          const localData: ScanRecord[] = raw ? JSON.parse(raw) : [];
          const merged = [...firestoreData];
          const seenTimestamps = new Set(firestoreData.map((r) => r.timestamp));

          localData.forEach((record) => {
            if (record.timestamp && !seenTimestamps.has(record.timestamp)) {
              merged.push(record);
            }
          });

          // Sort and limit - keep latest 10 for display, 100 for storage
          const sorted = merged
            .sort((a, b) => {
              const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return bTime - aTime;
            })
            .slice(0, 10);

          setScans(sorted);

          // Update AsyncStorage with latest 100 records
          AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(merged.slice(0, 100)));
        });
      }, (error) => {
        console.error("[Home] Firestore listener error:", error);
        loadFromStorage(); // Fallback to AsyncStorage
      });

      unsubscribeRef.current = unsubscribe;
    };

    setupFirestoreListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // ── Pull to Refresh ────────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFromStorage();
    setRefreshing(false);
  }, []);

  // ── Derived Stats ───────────────────────────────────────────────────────────────
  const { total, healthy, diseased, avgConfidence } = useMemo(() => {
    const total = scans.length;
    const healthy = scans.filter((r) => r.category === "healthy").length;
    const diseased = total - healthy;
    const avgConfidence = total > 0 ? scans.reduce((sum, r) => sum + (r.confidence || 0), 0) / total : 0;
    return { total, healthy, diseased, avgConfidence };
  }, [scans]);

  // ── Time of Day ───────────────────────────────────────────────────────────────
  const timeOfDay = getTimeOfDay();
  const greetIcon = TIME_ICONS[timeOfDay];
  const iconColor = TIME_ICON_COLORS[timeOfDay];

  return (
    <View style={styles.container}>
      <AppHeader />

      <FlatList
        data={["header"]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* ── Greeting Card ──────────────────────────────────────────────── */}
            <View style={styles.greetingCard}>
              <View style={styles.greetingTop}>
                <View style={styles.greetingLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: iconColor + "1A" }]}>
                    <User size={22} color={iconColor} />
                  </View>
                  <View style={styles.greetingText}>
                    <Text style={styles.greetingLabel}>Good {timeOfDay}</Text>
                    <Text style={styles.greetingName} numberOfLines={1}>
                      {userName || "User"}
                    </Text>
                  </View>
                </View>
                <UserProfileBadge
                  size={42}
                  onPress={() => router.push("/Profile")}
                />
              </View>
              <Text style={styles.greetingSubtext}>Welcome back to PathoNet</Text>
            </View>

            {/* ── Analytics Summary ──────────────────────────────────────────────── */}
            <AnalyticsSummary total={total} healthy={healthy} diseased={diseased} avgConfidence={avgConfidence} />

            {/* ── Recent Scans Feed ──────────────────────────────────────────────── */}
            <ScanFeed data={scans} onRefresh={onRefresh} refreshing={refreshing} />
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.lg,
    gap: SIZES.md,
  },
  greetingCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: SIZES.sm,
  },
  greetingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    flex: 1,
    marginRight: SIZES.md,
  },
  iconWrapper: {
    width: SIZES.xl,
    height: SIZES.xl,
    borderRadius: SIZES.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingText: {
    flex: 1,
  },
  greetingLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  greetingName: {
    fontSize: SIZES.fontXxl,
    fontWeight: "700",
    color: COLORS.textDark,
    marginTop: SIZES.xs,
  },
  greetingSubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
    fontWeight: "400",
  },
});

const summaryStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SIZES.sm,
  },
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: SIZES.xs,
  },
  iconWrapper: {
    width: SIZES.lg,
    height: SIZES.lg,
    borderRadius: SIZES.radius,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: SIZES.fontXxl,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  label: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    fontWeight: "500",
    textAlign: "center",
  },
});

const feedCardStyles = StyleSheet.create({
  container: {
    gap: SIZES.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.sm,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  viewAll: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: "600",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    marginBottom: SIZES.sm,
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "#f3f4f6",
  },
  content: {
    padding: SIZES.md,
    gap: SIZES.xs,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    flex: 1,
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.textDark,
    marginRight: SIZES.sm,
  },
  badge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  badgeText: {
    fontSize: SIZES.fontSm,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  label: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
    fontWeight: "500",
  },
  description: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SIZES.xs,
  },
  timestamp: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
  },
  confidence: {
    fontSize: SIZES.fontSm,
    fontWeight: "700",
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xxxl,
    alignItems: "center",
    gap: SIZES.md,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
    color: COLORS.textMid,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    textAlign: "center",
  },
});