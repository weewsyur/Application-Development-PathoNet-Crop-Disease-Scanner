import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Clock, Trash2, Search } from "lucide-react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import AppHeader from "@/components/AppHeader";
import { COLORS, SIZES } from "@/constants/theme";
import { collection, getDocs, query, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getCategoryWithTranslation,
  getConfidenceHint,
} from "@/utils/scanLabels";
import type { ScanRecord } from "./Scan";
import { STORAGE_KEYS } from "@/lib/storage";

const FILTERS = ["All", "Healthy", "Diseased"];

const LeafIcon = ({ color }: { color: string }) => (
  <View style={[leafIcon.outer, { backgroundColor: color + "22" }]}>
    <View style={[leafIcon.inner, { backgroundColor: color }]} />
  </View>
);

const leafIcon = StyleSheet.create({
  outer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderTopRightRadius: 2,
  },
});

export default function HistoryScreen() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [historyData, setHistoryData] = useState<ScanRecord[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const router = useRouter();

  // Debounced search effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reload data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      // Sync from Firestore in background (debounced)
      const syncTimeout = setTimeout(() => {
        syncFromFirestore();
      }, 500);
      return () => clearTimeout(syncTimeout);
    }, []),
  );

  const loadHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      if (history) {
        setHistoryData(JSON.parse(history));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  // DEDUP: merges AsyncStorage + Firestore; Firestore id wins on collision
  const syncFromFirestore = useCallback(async () => {
    try {
      const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
      if (!uid) return;

      // Limit query to latest 50 records for performance
      const q = query(collection(db, "users", uid, "scans"));
      const querySnapshot = await getDocs(q);

      const firestoreRecords: ScanRecord[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data() as ScanRecord;
        firestoreRecords.push(data);
      });

      // Merge with AsyncStorage, prioritizing Firestore as source of truth
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      const localHistory: ScanRecord[] = raw ? JSON.parse(raw) : [];

      // Create a map of firestore records by timestamp to avoid duplicates
      const firestoreMap = new Map<string, ScanRecord>();
      firestoreRecords.forEach((record) => {
        firestoreMap.set(record.timestamp || "", record);
      });

      // Merge: keep Firestore records, add local records not in Firestore
      const merged: ScanRecord[] = [];
      const seenTimestamps = new Set<string>();

      // Add Firestore records first
      firestoreRecords.forEach((record) => {
        if (record.timestamp) {
          merged.push(record);
          seenTimestamps.add(record.timestamp);
        }
      });

      // Add local records not in Firestore
      localHistory.forEach((record) => {
        if (record.timestamp && !seenTimestamps.has(record.timestamp)) {
          merged.push(record);
        }
      });

      // Sort by timestamp descending and keep latest 100
      merged.sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });
      const final = merged.slice(0, 100);

      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(final));
      setHistoryData(final);
    } catch (e) {
      console.error("[History] syncFromFirestore error:", e);
      // Silently fail - app continues with AsyncStorage data
    }
  }, []);

  const formatDate = useCallback((isoString?: string) => {
    if (!isoString) return "Unknown date";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  }, []);

  const formatTime = useCallback((isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  }, []);

  const filtered = useMemo(() => {
    return historyData.filter((item) => {
      const matchSearch =
        item.scanName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        item.label.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchFilter =
        activeFilter === "All" ||
        (activeFilter === "Healthy" && item.category === "healthy") ||
        (activeFilter === "Diseased" && item.category !== "healthy");
      return matchSearch && matchFilter;
    });
  }, [historyData, debouncedSearch, activeFilter]);

  const { totalScans, healthyCount, diseasedCount } = useMemo(() => {
    const totalScans = historyData.length;
    const healthyCount = historyData.filter(
      (i) => i.category === "healthy",
    ).length;
    const diseasedCount = totalScans - healthyCount;
    return { totalScans, healthyCount, diseasedCount };
  }, [historyData]);

  return (
    <View style={styles.container}>
      <AppHeader title="PATHONET" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Summary strip */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{totalScans}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardGreen]}>
            <Text style={[styles.summaryNum, { color: COLORS.primary }]}>
              {healthyCount}
            </Text>
            <Text style={styles.summaryLabel}>Healthy</Text>
          </View>
          <View style={[styles.summaryCard, styles.summaryCardRed]}>
            <Text style={[styles.summaryNum, { color: "#E53935" }]}>
              {diseasedCount}
            </Text>
            <Text style={styles.summaryLabel}>Diseased</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <View style={styles.searchIcon}>
            <View style={styles.searchCircle} />
            <View style={styles.searchHandle} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop or disease..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                activeFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History list */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>
            {filtered.length} {filtered.length === 1 ? "Record" : "Records"}
          </Text>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No records found</Text>
            </View>
          ) : (
            filtered.map((item, idx) => {
              const isHealthy = item.category === "healthy";
              const iconColor = isHealthy ? COLORS.primary : "#E53935";
              const badgeColor = isHealthy ? "#E8F8E8" : "#FFEBEE";
              const badgeText = isHealthy ? COLORS.primary : "#E53935";
              const categoryLabel = getCategoryWithTranslation(item.category as any);
              const confidenceHint = getConfidenceHint(item.confidence || 0);

              return (
                <TouchableOpacity
                  key={idx}
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => {
                    router.push({
                      pathname: "/ScanDetails",
                      params: { scan: JSON.stringify(item) }
                    } as any);
                  }}
                >
                  <LeafIcon color={iconColor} />

                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cropName}>
                        {item.scanName || item.label}
                      </Text>
                      <View
                        style={[styles.badge, { backgroundColor: badgeColor }]}
                      >
                        <Text style={[styles.badgeText, { color: badgeText }]}>
                          {categoryLabel.english}
                        </Text>
                        <Text
                          style={[
                            styles.badgeTagalog,
                            { color: badgeText },
                          ]}
                        >
                          {categoryLabel.tagalog}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.diseaseName}>{item.label}</Text>
                    {!!item.notes?.trim() && (
                      <View style={styles.obsNoteRow}>
                        <Search
                          size={12}
                          color={COLORS.textLight}
                        />
                        <Text
                          style={styles.obsNoteText}
                          numberOfLines={2}
                        >
                          {item.notes.trim()}
                        </Text>
                      </View>
                    )}
                    {item.scanDescription && (
                      <Text style={styles.description} numberOfLines={2}>
                        {item.scanDescription}
                      </Text>
                    )}
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaText}>
                        {formatDate(item.timestamp || "")} ·{" "}
                        {formatTime(item.timestamp || "")}
                      </Text>
                      <View style={styles.confidenceWrapper}>
                        <Text style={[styles.confidence, { color: iconColor }]}>
                          {`${Math.round((item.confidence || 0) * 100)}% confident`}
                        </Text>
                        <Text
                          style={[
                            styles.confidenceHint,
                            { color: iconColor },
                          ]}
                        >
                          ({confidenceHint.tagalog})
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 14,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryCardGreen: {
    borderTopWidth: 3,
    borderTopColor: COLORS.primary,
  },
  summaryCardRed: {
    borderTopWidth: 3,
    borderTopColor: "#E53935",
  },
  summaryNum: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  searchCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    position: "absolute",
    top: 0,
    left: 0,
  },
  searchHandle: {
    width: 5,
    height: 2,
    backgroundColor: COLORS.textLight,
    borderRadius: 1,
    position: "absolute",
    bottom: 1,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listSection: {
    gap: 10,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 2,
    marginBottom: 2,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textLight,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cropName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTagalog: {
    fontSize: 9,
    fontStyle: "italic",
    opacity: 0.7,
    marginTop: 1,
  },
  diseaseName: {
    fontSize: 13,
    color: COLORS.textMid,
    fontWeight: "500",
  },
  obsNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  obsNoteIcon: {
    marginTop: 2,
  },
  obsNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: "italic",
  },
  description: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "400",
    marginTop: 4,
    lineHeight: 16,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  confidence: {
    fontSize: 11,
    fontWeight: "700",
  },
  confidenceWrapper: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  confidenceHint: {
    fontSize: 9,
    fontStyle: "italic",
    opacity: 0.7,
  },
});
