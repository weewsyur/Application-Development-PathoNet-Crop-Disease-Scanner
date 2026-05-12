/**
 * Analytics.tsx — PathoNet Scan Analytics
 * ─────────────────────────────────────────────────────────────────────────────
 * Refreshes automatically every time the tab is focused (useFocusEffect).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { TrendingUp, Activity, BarChart3, PieChart, Filter, Download, RefreshCw, Clock } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { COLORS, SIZES } from "@/constants/theme";
import { CATEGORY_COLOR } from "@/constants/categoryColors";
import type { ScanRecord } from "./Scan"; // reuse the shared type
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, query, deleteDoc, doc, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getCategoryWithTranslation,
  getConfidenceHint,
} from "@/utils/scanLabels";
import { STORAGE_KEYS } from "@/lib/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "history">(
    "overview",
  );
  const now = new Date(); // Define outside useMemo for use in render

  // ── Reload every time the tab is focused ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
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
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      if (raw) {
        setHistory(JSON.parse(raw));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("[Analytics] loadHistory error:", e);
      setHistory([]);
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
      setHistory(final);

      console.log(
        "[Analytics] Synced from Firestore:",
        firestoreRecords.length,
        "records",
      );
    } catch (e) {
      console.error("[Analytics] syncFromFirestore error:", e);
      // Silently fail - app continues with AsyncStorage data
    }
  }, []);

  // ── Clear all history ─────────────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    const executeClear = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, "[]");
        setHistory([]);
        // Also clear from Firestore
        const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
        if (uid) {
          const q = query(collection(db, "users", uid, "scans"));
          const querySnapshot = await getDocs(q);
          const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
        }
        Alert.alert("Success", "History cleared successfully");
      } catch (e) {
        console.error("[Analytics] clearHistory error:", e);
      }
    };

    if (Platform.OS === "web") {
      const confirmed = globalThis.confirm(
        "This will permanently delete all scan records. Continue?",
      );
      if (confirmed) {
        await executeClear();
      }
      return;
    }

    Alert.alert(
      "Clear All History",
      "This will permanently delete all scan records. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            executeClear();
          },
        },
      ],
    );
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const { total, healthy, diseased, avgConf, diseaseCounts, maxDiseaseCount, diseaseRows, topDisease, thisMonthScans, STATS } = useMemo(() => {
    const total = history.length;
    const healthy = history.filter((r) => r.category === "healthy").length;
    const diseased = total - healthy;
    const avgConf =
      total > 0
        ? history.reduce((s, r) => s + (r.confidence ?? 0), 0) / total
        : 0;

    const diseaseCounts = history.reduce<Record<string, number>>((acc, r) => {
      if (r.category !== "healthy") {
        acc[r.category] = (acc[r.category] ?? 0) + 1;
      }
      return acc;
    }, {});

    const maxDiseaseCount = Math.max(1, ...Object.values(diseaseCounts));

    const diseaseRows = [
      { key: "fungal", label: "Fungal" },
      { key: "bacterial", label: "Bacterial" },
      { key: "viral", label: "Viral" },
      { key: "pest", label: "Pest" },
    ]
      .map((d) => ({ ...d, count: diseaseCounts[d.key] ?? 0 }))
      .filter((d) => d.count > 0);

    // Top disease (for quick summary)
    const topDisease =
      diseaseRows.sort((a, b) => b.count - a.count)[0]?.label ?? "—";

    // Current month scans
    const thisMonthScans = history.filter((r) => {
      try {
        const d = r.timestamp ? new Date(r.timestamp) : null;
        if (!d) return false;
        return (
          d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        );
      } catch {
        return false;
      }
    }).length;

    const STATS = [
      {
        icon: "scan-outline" as const,
        label: "Total Scans",
        value: total.toString(),
        color: "#3b82f6",
      },
      {
        icon: "bug-outline" as const,
        label: "Diseases Found",
        value: diseased.toString(),
        color: "#ef4444",
      },
      {
        icon: "leaf-outline" as const,
        label: "Healthy Crops",
        value: healthy.toString(),
        color: "#22c55e",
      },
      {
        icon: "analytics-outline" as const,
        label: "Avg Confidence",
        value: total > 0 ? `${(avgConf * 100).toFixed(1)}%` : "—",
        color: "#f59e0b",
      },
    ];

    return { total, healthy, diseased, avgConf, diseaseCounts, maxDiseaseCount, diseaseRows, topDisease, thisMonthScans, STATS };
  }, [history]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader />

      {/* ── Tab switcher ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={StyleSheet.flatten([
            styles.tab,
            activeTab === "overview" && styles.tabActive,
          ])}
          onPress={() => setActiveTab("overview")}
        >
          <Text
            style={StyleSheet.flatten([
              styles.tabText,
              activeTab === "overview" && styles.tabTextActive,
            ])}
          >
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={StyleSheet.flatten([
            styles.tab,
            activeTab === "history" && styles.tabActive,
          ])}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={StyleSheet.flatten([
              styles.tabText,
              activeTab === "history" && styles.tabTextActive,
            ])}
          >
            History ({total})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ════════════════════════ OVERVIEW TAB ════════════════════════ */}
        {activeTab === "overview" && (
          <>
            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {STATS.map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <View
                    style={StyleSheet.flatten([
                      styles.statIconWrap,
                      { backgroundColor: s.color + "1A" },
                    ])}
                  >
                    <TrendingUp size={22} color={s.color} />
                  </View>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Disease breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Disease Breakdown</Text>
              {diseaseRows.length > 0 ? (
                diseaseRows.map((d) => (
                  <View key={d.key} style={styles.diseaseRow}>
                    <View style={styles.diseaseHeader}>
                      <View
                        style={StyleSheet.flatten([
                          styles.diseaseDot,
                          { backgroundColor: CATEGORY_COLOR[d.key] },
                        ])}
                      />
                      <View style={styles.diseaseNameWrapper}>
                        <Text style={styles.diseaseName}>{d.label}</Text>
                        <Text style={styles.diseaseTagalog}>
                          {getCategoryWithTranslation(d.key as any).tagalog}
                        </Text>
                      </View>
                      <Text style={styles.diseaseCount}>{d.count}</Text>
                    </View>
                    <View style={styles.diseaseTrack}>
                      <View
                        style={StyleSheet.flatten([
                          styles.diseaseFill,
                          {
                            flex: d.count / maxDiseaseCount,
                            backgroundColor: CATEGORY_COLOR[d.key],
                          },
                        ])}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyWrap}>
                  <BarChart3
                    size={36}
                    color={COLORS.textLight}
                  />
                  <Text style={styles.emptyText}>
                    No disease data yet.{"\n"}Start scanning to see statistics.
                  </Text>
                </View>
              )}
            </View>

            {/* Monthly summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Current Month</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>
                    {now.toLocaleString("en-PH", { month: "long" })}
                  </Text>
                  <Text style={styles.summaryLabel}>Month</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{thisMonthScans}</Text>
                  <Text style={styles.summaryLabel}>Scans Done</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNum}>{topDisease}</Text>
                  <Text style={styles.summaryLabel}>Top Disease</Text>
                </View>
              </View>
            </View>

            {/* Health ratio */}
            {total > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Health Ratio</Text>
                <View style={styles.ratioTrack}>
                  <View
                    style={StyleSheet.flatten([
                      styles.ratioFillGreen,
                      { flex: healthy || 0.001 },
                    ])}
                  />
                  <View
                    style={StyleSheet.flatten([
                      styles.ratioFillRed,
                      { flex: diseased || 0.001 },
                    ])}
                  />
                </View>
                <View style={styles.ratioLegend}>
                  <View style={styles.legendItem}>
                    <View
                      style={StyleSheet.flatten([
                        styles.legendDot,
                        { backgroundColor: "#22c55e" },
                      ])}
                    />
                    <Text style={styles.legendText}>Healthy ({healthy})</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View
                      style={StyleSheet.flatten([
                        styles.legendDot,
                        { backgroundColor: "#ef4444" },
                      ])}
                    />
                    <Text style={styles.legendText}>Diseased ({diseased})</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* ════════════════════════ HISTORY TAB ════════════════════════ */}
        {activeTab === "history" && (
          <>
            {history.length > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={clearHistory}
                >
                  <Download size={14} color="#ef4444" />
                  <Text style={styles.clearBtnText}>Clear All</Text>
                </TouchableOpacity>

                {history.map((record, i) => {
                  const color = CATEGORY_COLOR[record.category] ?? "#6b7280";
                  // Severity icon based on category
                  const severityIcon =
                    record.category === "healthy"
                      ? "checkmark-circle"
                      : record.category === "pest"
                        ? "warning"
                        : "alert-circle";
                  return (
                    <View key={i} style={styles.historyCard}>
                      {/* Left accent */}
                      <View
                        style={StyleSheet.flatten([
                          styles.historyAccent,
                          { backgroundColor: color },
                        ])}
                      />
                      <View style={styles.historyBody}>
                        {/* Top row */}
                        <View style={styles.historyTop}>
                          <Text style={styles.historyName} numberOfLines={1}>
                            {record.scanName ?? record.label}
                          </Text>
                          <View style={styles.historyBadgeRow}>
                            <Activity
                              size={16}
                              color={color}
                              style={styles.severityIcon}
                            />
                            <View
                              style={StyleSheet.flatten([
                                styles.historyBadge,
                                {
                                  backgroundColor: color + "22",
                                  borderColor: color,
                                },
                              ])}
                            >
                              <Text
                                style={StyleSheet.flatten([
                                  styles.historyBadgeText,
                                  { color },
                                ])}
                              >
                                {record.category}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Label */}
                        <Text style={styles.historyLabel} numberOfLines={1}>
                          {record.label}
                        </Text>

                        {!!record.notes?.trim() && (
                          <View style={styles.obsNoteRow}>
                            <Filter
                              size={12}
                              color={COLORS.textLight}
                              style={styles.obsNoteIcon}
                            />
                            <Text
                              style={styles.obsNoteText}
                              numberOfLines={2}
                            >
                              {record.notes.trim()}
                            </Text>
                          </View>
                        )}

                        {/* Notes */}
                        {!!record.scanDescription && (
                          <Text style={styles.historyNotes} numberOfLines={2}>
                            {record.scanDescription}
                          </Text>
                        )}

                        {/* Footer */}
                        <View style={styles.historyFooter}>
                          <View style={styles.confidenceWrap}>
                            <Text style={styles.historyConf}>
                              {`${(record.confidence * 100).toFixed(1)}% confident`}
                            </Text>
                            <Text style={styles.historyConfHint}>
                              ({getConfidenceHint(record.confidence).tagalog})
                            </Text>
                          </View>
                          <Text style={styles.historyDate}>
                            {record.timestamp
                              ? formatDate(record.timestamp)
                              : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.emptyWrap}>
                <Clock
                  size={48}
                  color={COLORS.textLight}
                />
                <Text style={styles.emptyText}>
                  No scan history yet.{"\n"}Go to Scan and analyse a plant!
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? "#f8fafc" },

  // Tab switcher
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight ?? "#9ca3af",
  },
  tabTextActive: { color: COLORS.primary ?? "#16a34a" },

  // Scroll
  content: { padding: 16, gap: 14, paddingBottom: 40 },

  // Stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    backgroundColor: COLORS.white ?? "#fff",
    borderRadius: SIZES.radius ?? 12,
    padding: 16,
    width: "47%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 6,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark ?? "#111827",
  },
  statLabel: { fontSize: 12, color: COLORS.textLight ?? "#9ca3af" },

  // Card
  card: {
    backgroundColor: COLORS.white ?? "#fff",
    borderRadius: SIZES.radiusLg ?? 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark ?? "#111827",
    marginBottom: 16,
  },

  // Disease breakdown
  diseaseRow: { marginBottom: 14 },
  diseaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  diseaseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  diseaseNameWrapper: {
    flex: 1,
    gap: 2,
  },
  diseaseName: {
    fontSize: 14,
    color: COLORS.textMid ?? "#374151",
    fontWeight: "500",
  },
  diseaseTagalog: {
    fontSize: 11,
    color: COLORS.textLight ?? "#9ca3af",
    fontStyle: "italic",
    fontWeight: "400",
  },
  diseaseCount: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark ?? "#111827",
  },
  diseaseTrack: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  diseaseFill: { height: "100%", borderRadius: 3 },

  // Monthly summary
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryNum: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary ?? "#16a34a",
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textLight ?? "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border ?? "#e5e7eb",
  },

  // Health ratio
  ratioTrack: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 12,
  },
  ratioFillGreen: { backgroundColor: "#22c55e" },
  ratioFillRed: { backgroundColor: "#ef4444" },
  ratioLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13, color: COLORS.textMid ?? "#374151" },

  // History
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  clearBtnText: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
  historyCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white ?? "#fff",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 2,
  },
  historyAccent: { width: 5 },
  historyBody: { flex: 1, padding: 14 },
  historyTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  historyName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark ?? "#111827",
    marginRight: 8,
  },
  historyBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  severityIcon: {
    marginRight: 2,
  },
  historyBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  historyLabel: {
    fontSize: 12,
    color: COLORS.textMid ?? "#374151",
    marginBottom: 4,
  },
  obsNoteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginBottom: 4,
  },
  obsNoteIcon: {
    marginTop: 2,
  },
  obsNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textLight ?? "#9ca3af",
    fontStyle: "italic",
  },
  historyNotes: {
    fontSize: 12,
    color: COLORS.textLight ?? "#9ca3af",
    fontStyle: "italic",
    marginBottom: 6,
  },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  confidenceWrap: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  historyConf: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary ?? "#16a34a",
  },
  historyConfHint: {
    fontSize: 10,
    fontStyle: "italic",
    color: COLORS.textLight ?? "#9ca3af",
  },
  historyDate: { fontSize: 11, color: COLORS.textLight ?? "#9ca3af" },

  // Empty state
  emptyWrap: { alignItems: "center", paddingVertical: 32, gap: 10 },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight ?? "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 22,
  },
});
