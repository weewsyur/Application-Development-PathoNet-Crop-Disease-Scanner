import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Calendar, MapPin, Activity, TrendingUp, AlertTriangle, CheckCircle, Image as ImageIcon, Clock, Bug } from "lucide-react";
import { COLORS, SIZES } from "@/constants/theme";
import AppHeader from "@/components/AppHeader";
import {
  getCategoryWithTranslation,
  getConfidenceHint,
  normalizeScanCategory,
} from "@/utils/scanLabels";
import ScanAlertBanner from "@/components/ScanAlertBanner";
import type { ScanRecord } from "@/app/(tabs)/Scan";

interface RouteParams {
  scan: ScanRecord;
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case "healthy":
      return { bg: "#E8F8E8", text: COLORS.primary, icon: "checkmark-circle" as const };
    case "fungal":
      return { bg: "#FFE8E8", text: "#E53935", icon: "warning" as const };
    case "bacterial":
      return { bg: "#FFF3E0", text: "#F57C00", icon: "warning" as const };
    case "viral":
      return { bg: "#F3E5F5", text: "#8E24AA", icon: "alert-circle" as const };
    case "pest":
      return { bg: "#E0F7FA", text: "#00838F", icon: "bug" as const };
    default:
      return { bg: "#FFF8E1", text: "#F59E0B", icon: "alert-circle" as const };
  }
};

const formatDate = (isoString?: string) => {
  if (!isoString) return "Unknown date";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

const formatTime = (isoString?: string) => {
  if (!isoString) return "Unknown time";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Unknown time";
  }
};

const CategoryIcon = ({
  category,
  size = 48,
}: {
  category: string;
  size?: number;
}) => {
  const uiCategory = normalizeScanCategory(category);
  const colors = getCategoryColor(uiCategory);
  const iconName = colors.icon;

  return (
    <View
      style={[
        styles.categoryIconContainer,
        { width: size, height: size, backgroundColor: colors.bg },
      ]}
    >
      {iconName === 'checkmark-circle' ? (
        <CheckCircle size={size / 2} color={colors.text} />
      ) : iconName === 'warning' ? (
        <AlertTriangle size={size / 2} color={colors.text} />
      ) : iconName === 'bug' ? (
        <Bug size={size / 2} color={colors.text} />
      ) : (
        <Activity size={size / 2} color={colors.text} />
      )}
    </View>
  );
};

export default function ScanDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scan?: string }>();
  const [scan, setScan] = useState<ScanRecord | null>(null);

  useEffect(() => {
    if (params?.scan) {
      try {
        const parsedScan = JSON.parse(params.scan) as ScanRecord;
        setScan(parsedScan);
      } catch (e) {
        console.error("[ScanDetails] Failed to parse scan data:", e);
      }
    }
  }, [params?.scan]);

  const record = scan;

  if (!record) {
    return (
      <View style={styles.container}>
        <AppHeader title="Scan Details" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No scan data available</Text>
        </View>
      </View>
    );
  }

  const uiCategory = normalizeScanCategory(record.category);
  const colors = getCategoryColor(uiCategory);
  const confidencePercent = Math.round((record.confidence || 0) * 100);
  const categoryLabel = getCategoryWithTranslation(record.category);
  const confidenceHint = getConfidenceHint(record.confidence || 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Details</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Section */}
        <View style={styles.imageContainer}>
          {record.imageUri ? (
            <Image source={{ uri: record.imageUri }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ImageIcon size={64}
                color={COLORS.textLight}
              />
              <Text style={styles.placeholderText}>No image available</Text>
            </View>
          )}
        </View>

        {/* Plant Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plant Name</Text>
          <View style={styles.card}>
            <Text style={styles.plantName}>
              {record.scanName || record.label}
            </Text>
          </View>
        </View>

        {/* Status & Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={[styles.card, styles.statusCard]}>
            <View style={styles.statusContent}>
              <CategoryIcon category={record.category} size={56} />
              <View style={styles.statusText}>
                <View style={styles.statusLabelRow}>
                  <Text style={[styles.statusLabel, { color: colors.text }]}>
                    {categoryLabel.english}
                  </Text>
                  <Text style={[styles.statusTagalog, { color: colors.text }]}>
                    ({categoryLabel.tagalog})
                  </Text>
                </View>
                <Text style={styles.categoryName}>
                  {record.category.charAt(0).toUpperCase() +
                    record.category.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Confidence Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidence Score</Text>
          <View style={styles.card}>
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceLeft}>
                <Text
                  style={[styles.confidencePercent, { color: colors.text }]}
                >
                  {`${confidencePercent}%`}
                </Text>
                <Text style={styles.confidenceLabel}>Confident</Text>
                <Text style={[styles.confidenceTagalog, { color: colors.text }]}>
                  ({confidenceHint.tagalog})
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${confidencePercent}%` as any,
                      backgroundColor: colors.text,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Disease Label */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disease Label</Text>
          <View style={styles.card}>
            <Text style={styles.diseaseLabel}>{record.label}</Text>
          </View>
        </View>

        {record.timestamp ? (
          <ScanAlertBanner
            category={record.category}
            confidence={record.confidence ?? 0}
            label={record.label}
            timestamp={record.timestamp}
            firestoreId={record.firestoreId}
            initialNote={record.notes ?? ""}
            onNoteSaved={(notes) =>
              setScan((prev) => prev ? { ...prev, notes } : null)
            }
          />
        ) : null}

        {/* Description */}
        {record.scanDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.card}>
              <Text style={styles.description}>{record.scanDescription}</Text>
            </View>
          </View>
        )}

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Date & Time</Text>
          <View style={styles.card}>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Calendar
                  size={18}
                  color={COLORS.textMid}
                />
                <Text style={styles.dateTimeText}>
                  {formatDate(record.timestamp)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Clock
                  size={18}
                  color={COLORS.textMid}
                />
                <Text style={styles.dateTimeText}>
                  {formatTime(record.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Info</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scan ID</Text>
              <Text style={styles.infoValue}>
                {record.firestoreId || "Not available"}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scan Name</Text>
              <Text style={styles.infoValue}>
                {record.scanName || "Not specified"}
              </Text>
            </View>
          </View>
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
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxxl,
    gap: SIZES.xl,
  },
  imageContainer: {
    borderRadius: SIZES.radiusLg,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: SIZES.sm,
  },
  image: {
    width: "100%",
    height: 280,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: 280,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  section: {
    gap: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontSm,
    fontWeight: "700",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: SIZES.xs,
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
  },
  plantName: {
    fontSize: SIZES.fontXl,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    flex: 1,
  },
  categoryIconContainer: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    flex: 1,
    gap: SIZES.xs,
  },
  statusLabel: {
    fontSize: SIZES.fontLg,
    fontWeight: "700",
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SIZES.xs,
  },
  statusTagalog: {
    fontSize: SIZES.fontSm,
    fontStyle: "italic",
    opacity: 0.85,
  },
  categoryName: {
    fontSize: SIZES.fontSm,
    color: COLORS.textMid,
    fontWeight: "500",
  },
  confidenceContainer: {
    gap: SIZES.md,
  },
  confidenceLeft: {
    gap: SIZES.xs,
  },
  confidencePercent: {
    fontSize: SIZES.fontXxxl,
    fontWeight: "800",
  },
  confidenceLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  confidenceTagalog: {
    fontSize: SIZES.fontSm,
    fontStyle: "italic",
    marginTop: SIZES.xs,
  },
  progressBar: {
    height: SIZES.sm,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: SIZES.radiusSm,
  },
  diseaseLabel: {
    fontSize: SIZES.fontLg,
    fontWeight: "600",
    color: COLORS.textDark,
    lineHeight: 24,
  },
  description: {
    fontSize: SIZES.font,
    color: COLORS.textMid,
    lineHeight: 22,
    fontWeight: "400",
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.sm,
    flex: 1,
  },
  dateTimeText: {
    fontSize: SIZES.font,
    color: COLORS.textDark,
    fontWeight: "500",
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
