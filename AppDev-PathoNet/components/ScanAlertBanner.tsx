import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLORS, SIZES } from "@/constants/theme";
import type { ScanRecord } from "@/app/(tabs)/Scan";
import { getCurabilityHint } from "@/utils/curabilityHints";
import { STORAGE_KEYS } from "@/lib/storage";


export type ScanAlertBannerProps = {
  category: string;
  confidence: number;
  label: string;
  timestamp: string;
  firestoreId?: string;
  initialNote?: string;
  /** When the scan is not in `scanHistory` yet (e.g. Scan tab before save modal completes). */
  onUnpersistedNote?: (note: string) => void;
  onNoteSaved?: (notes: string) => void;
};

type RiskLevel = "high" | "moderate";

function getRiskLevel(
  category: string,
  confidence: number,
): RiskLevel | null {
  if (category === "healthy") return null;
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6 && confidence < 0.8) return "moderate";
  return null;
}

const ScanAlertBanner = React.memo(function ScanAlertBanner({
  category,
  confidence,
  label,
  timestamp,
  firestoreId: firestoreIdProp,
  initialNote = "",
  onUnpersistedNote,
  onNoteSaved,
}: ScanAlertBannerProps) {
  const risk = getRiskLevel(category, confidence);
  const [noteText, setNoteText] = useState(initialNote);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setNoteText(initialNote);
  }, [initialNote, timestamp]);

  const runSuccessAnimation = useCallback(() => {
    successOpacity.setValue(1);
    Animated.sequence([
      Animated.delay(2000),
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [successOpacity]);

  const persistNote = useCallback(async (text: string) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    const history: ScanRecord[] = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex((r) => r.timestamp === timestamp);
    if (idx === -1) {
      // Scan not in history - use unpersisted callback if available, otherwise log and return
      if (onUnpersistedNote) {
        onUnpersistedNote(text);
        onNoteSaved?.(text);
        return;
      }
      // Don't throw error - just log and return to prevent call stack crash
      console.warn("[ScanAlertBanner] Scan not found in local history, note not persisted");
      onNoteSaved?.(text);
      return;
    }
    const prev = history[idx];
    const updatedRecord: ScanRecord = {
      ...prev,
      notes: text,
      firestoreId: prev.firestoreId ?? firestoreIdProp,
    };
    history[idx] = updatedRecord;
    await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));

    const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
    const fid = updatedRecord.firestoreId;
    if (uid && fid) {
      try {
        await updateDoc(doc(db, "users", uid, "scans", fid), { notes: text });
      } catch (fe) {
        console.error("[ScanAlertBanner] Firestore note update:", fe);
      }
    }
    onNoteSaved?.(text);
  }, [timestamp, firestoreIdProp, onUnpersistedNote, onNoteSaved]);

  const handleSaveNote = useCallback(async () => {
    const trimmed = noteText.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      await persistNote(trimmed);
      runSuccessAnimation();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(false);
    } catch (e) {
      console.error("[ScanAlertBanner] save note:", e);
    } finally {
      setIsSaving(false);
    }
  }, [noteText, isSaving, persistNote, runSuccessAnimation]);

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((e) => !e);
  }, []);

  if (!risk) return null;

  const { isHigh, bannerColor, iconName, title, message } = useMemo(() => {
    const isHigh = risk === "high";
    const bannerColor = isHigh ? "#ef4444" : "#f59e0b";
    const iconName = isHigh ? "alert-circle-outline" : "warning-outline";
    const title = isHigh ? "HIGH RISK" : "MODERATE RISK";
    const message = isHigh
      ? "High confidence this crop is diseased — immediate attention recommended."
      : "Moderate confidence this crop may be diseased — review and monitor closely.";
    return { isHigh, bannerColor, iconName, title, message };
  }, [risk]);

  const hint = useMemo(() => getCurabilityHint(label, category), [label, category]);
  const radius = SIZES.radius ?? 12;

  return (
    <View
      style={useMemo(() => [
        styles.wrap,
        {
          backgroundColor: COLORS.white,
          borderRadius: radius,
          borderLeftWidth: 4,
          borderLeftColor: bannerColor,
        },
      ], [radius, bannerColor])}
    >
      <View style={styles.bannerInner}>
        <Ionicons name={iconName as any} size={26} color={bannerColor} />
        <View style={styles.bannerTextCol}>
          <Text style={[styles.riskTitle, { color: bannerColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: bannerColor }]}
        onPress={toggleExpand}
        activeOpacity={0.75}
      >
        <Text style={[styles.addBtnText, { color: bannerColor }]}>
          Add Observation Note
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandArea}>
          <TextInput
            style={styles.input}
            placeholder="Describe what you observed after this scan…"
            placeholderTextColor={COLORS.textLight}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            scrollEnabled
            textAlignVertical="top"
            numberOfLines={4}
          />
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: COLORS.primary, opacity: isSaving ? 0.7 : 1 },
            ]}
            onPress={handleSaveNote}
            disabled={isSaving || !noteText.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {isSaving ? "Saving…" : "Save Note"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.Text style={[styles.success, { opacity: successOpacity }]}>
        Note saved ✓
      </Animated.Text>
    </View>
  );
});

export default ScanAlertBanner;

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  bannerInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bannerTextCol: {
    flex: 1,
    gap: 6,
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    lineHeight: 19,
  },
  hint: {
    fontSize: 12,
    fontStyle: "italic",
    color: COLORS.textMid,
    lineHeight: 17,
  },
  addBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  expandArea: {
    marginTop: 12,
    gap: 10,
  },
  input: {
    minHeight: 88,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: "#f9fafb",
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  success: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },
});
