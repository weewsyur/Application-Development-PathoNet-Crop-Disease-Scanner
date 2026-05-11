import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "@/components/AppHeader";
import ScanAlertBanner from "@/components/ScanAlertBanner";
import { COLORS } from "@/constants/theme";
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { STORAGE_KEYS } from "@/lib/storage";

const { height } = Dimensions.get("window");

// ─── Flask server address ─────────────────────────────────────────────────────
// Priority:
// 1) EXPO_PUBLIC_API_URL (if set and not localhost on native)
// 2) Expo host LAN IP (works for physical devices on same Wi-Fi)
// 3) Simulator defaults (10.0.2.2/localhost)
const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
const hostUri = Constants.expoConfig?.hostUri;
const expoHost = hostUri ? hostUri.split(":")[0] : undefined;
const expoLanApi = expoHost ? `http://${expoHost}:5000` : undefined;
const isNative = Platform.OS === "ios" || Platform.OS === "android";
const envIsLocalhost =
  envApiUrl?.includes("localhost") || envApiUrl?.includes("127.0.0.1");

const API_BASE =
  (envApiUrl && !(isNative && envIsLocalhost) ? envApiUrl : undefined) ||
  expoLanApi ||
  Platform.select({
    android: "http://10.0.2.2:5000",
    ios: "http://localhost:5000",
    default: "http://localhost:5000",
  }) ||
  "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ScanRecord {
  label: string;
  category: "healthy" | "fungal" | "bacterial" | "viral" | "pest";
  confidence: number;
  class_id: number;
  top3: Array<{ label: string; confidence: number }>;
  timestamp: string; // ISO-8601
  scanName?: string;
  scanDescription?: string;
  imageUri?: string;
  notes?: string;
  firestoreId?: string;
}

// ─── Category colour map ──────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  healthy: { color: "#22c55e", bg: "#f0fdf4" },
  fungal: { color: "#f59e0b", bg: "#fffbeb" },
  bacterial: { color: "#ef4444", bg: "#fef2f2" },
  viral: { color: "#8b5cf6", bg: "#f5f3ff" },
  pest: { color: "#06b6d4", bg: "#ecfeff" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ScanScreen() {
  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(1));

  // Image state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageB64, setImageB64] = useState<string | null>(null);

  // Scan state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanRecord | null>(null);

  // Local history (used only to keep count in status bar)
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [scanName, setScanName] = useState("");
  const [scanDescription, setScanDescription] = useState("");
  const [pendingResult, setPendingResult] = useState<ScanRecord | null>(null);
  const [preSaveObservationNote, setPreSaveObservationNote] = useState("");

  // Analytics identifiers
  const [userId, setUserId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Generate or load user ID and session ID for analytics
    const initAnalyticsIds = async () => {
      let storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_USER_ID);
      let storedSessionId = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_SESSION_ID);

      if (!storedUserId) {
        storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_USER_ID, storedUserId);
      }

      if (!storedSessionId) {
        storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_SESSION_ID, storedSessionId);
      }

      setUserId(storedUserId);
      setSessionId(storedSessionId);
    };

    loadHistory();
    initAnalyticsIds();
    // Sync from Firestore in background
    syncFromFirestore();
    return () => { };
  }, []);

  // ── Load history from AsyncStorage ───────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      if (raw) setScanHistory(JSON.parse(raw));
    } catch (e) {
      console.error("[Scan] loadHistory:", e);
    }
  }, []);

  // ── Sync from Firestore (background) ───────────────────────────────────────
  const syncFromFirestore = useCallback(async () => {
    try {
      const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
      if (!uid) return;

      // Limit query to latest 50 records for performance
      const q = query(collection(db, "users", uid, "scans"), limit(50));
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
      merged.sort(
        (a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        }
      );
      const final = merged.slice(0, 100);

      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(final));
      setScanHistory(final);
    } catch (e) {
      console.warn("[PathoNet] Network op failed, continuing offline:", e);
      // Silently fail - app continues with AsyncStorage data
    }
  }, []);

  // ── Persist a single record to AsyncStorage and Firestore (write-through) ──
  // DUAL-WRITE: AsyncStorage = offline cache | Firestore = cloud sync
  const saveRecord = useCallback(async (record: ScanRecord): Promise<void> => {
    try {
      // Always save locally first (offline source of truth)
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
      const history: ScanRecord[] = raw ? JSON.parse(raw) : [];
      const updated = [record, ...history].slice(0, 100); // keep latest 100
      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(updated));
      setScanHistory(updated);

      const saveToFirestore = async (record: ScanRecord) => {
        try {
          const uid = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_UID);
          if (!uid) return;

          const docRef = doc(collection(db, "users", uid, "scans"));
          await setDoc(docRef, record);
          return docRef.id;
        } catch (e) {
          console.warn("[PathoNet] Network op failed, continuing offline:", e);
        }
      };

      await saveToFirestore(record);
    } catch (e) {
      console.warn("[PathoNet] Network op failed, continuing offline:", e);
    }
  }, []);

  // ── Call Flask /predict (legacy endpoint for compatibility) ─────────────────
  // Note: The v2 endpoint (/predict/v2) has more features but different response format
  const callCnnApi = useCallback(async (base64Image: string): Promise<ScanRecord> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "X-User-ID": userId } : {}),
          ...(sessionId ? { "X-Session-ID": sessionId } : {}),
        },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown error");
        throw new Error(`CNN API responded ${res.status}: ${errText}`);
      }

      const json = await res.json();

      // Log response for debugging
      console.log("[Scan] API Response:", json);

      return {
        label: json.label ?? "Unknown",
        category: json.category ?? "fungal",
        confidence: json.confidence ?? 0,
        class_id: json.class_id ?? -1,
        top3: json.top3 ?? [],
        timestamp: new Date().toISOString(),
        imageUri: imageUri ?? undefined,
      } satisfies ScanRecord;
    } finally {
      clearTimeout(timeout);
    }
  }, [API_BASE, userId, sessionId, imageUri]);

  // ── Image-picker helpers ──────────────────────────────────────────────────
  const handleAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri || !asset.base64) {
      Alert.alert("Error", "Could not read image data. Please try again.");
      return;
    }
    setImageUri(asset.uri);
    setImageB64(asset.base64);
    setResult(null);
  }, []);

  const pickFromGallery = useCallback(async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow photo library access.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6, // Reduced from 0.8 to 0.6 for faster loading
      base64: true,
    });
    if (!picked.canceled && picked.assets?.length) {
      handleAsset(picked.assets[0]);
    }
  }, [handleAsset]);

  const takePhoto = useCallback(async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert("Permission required", "Please allow camera access.");
      return;
    }
    const photo = await ImagePicker.launchCameraAsync({
      quality: 0.6, // Reduced from 0.8 to 0.6 for faster loading
      base64: true,
    });
    if (!photo.canceled && photo.assets?.length) {
      handleAsset(photo.assets[0]);
    }
  }, [handleAsset]);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!imageUri || !imageB64) {
      Alert.alert("No Image", "Take a photo or choose from gallery first.");
      return;
    }

    // Pulse animation on scan button tap
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setResult(null);
    try {
      setLoading(true);
      const record = await callCnnApi(imageB64);
      setResult(record);
      setPendingResult(record);
      setModalVisible(true);
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "Request timed out. Is the CNN server running?"
          : (err?.message ?? "Scan failed");
      Alert.alert("Scan Error", msg);
    } finally {
      setLoading(false);
    }
  }, [imageUri, imageB64, scaleAnim, callCnnApi]);

  // ── Modal — save then navigate to Analytics ───────────────────────────────
  const commitAndNavigate = useCallback(async (name: string, description: string) => {
    if (!pendingResult) return;

    const noteTrim = preSaveObservationNote.trim();
    const finalRecord: ScanRecord = {
      ...pendingResult,
      scanName: name.trim() || `${pendingResult.label} Scan`,
      scanDescription: description.trim(),
      ...(noteTrim ? { notes: noteTrim } : {}),
    };

    setModalVisible(false);
    setScanName("");
    setScanDescription("");
    setPreSaveObservationNote("");

    await saveRecord(finalRecord);

    // Short pause so user sees the result card, then jump to Analytics
    setTimeout(() => {
      router.push("/(tabs)/Analytics");
    }, 400);
  }, [pendingResult, preSaveObservationNote, router]);

  const handleSave = useCallback(() => commitAndNavigate(scanName, scanDescription), [commitAndNavigate, scanName, scanDescription]);

  const handleSkip = useCallback(() => commitAndNavigate("", ""), [commitAndNavigate]);

  // ── Reset to scan again ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    setImageUri(null);
    setImageB64(null);
    setResult(null);
    setPendingResult(null);
    setPreSaveObservationNote("");
  }, []);

  const meta = result ? CATEGORY_META[result.category] : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Image preview ── */}
        <View style={styles.previewContainer}>
          {imageUri ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingText}>Analysing plant…</Text>
                  <Text style={styles.loadingSubText}>
                    Running PathoNet CNN
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name="leaf-outline" size={52} color={COLORS.primary} />
              <Text style={styles.placeholderTitle}>No image selected</Text>
              <Text style={styles.placeholderSub}>
                Take a photo or pick from gallery
              </Text>
            </View>
          )}
        </View>

        {/* ── Camera / Gallery buttons ── */}
        {!loading && !result && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cameraBtn]}
              onPress={takePhoto}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.actionBtnTextWhite}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.galleryBtn]}
              onPress={pickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name="images" size={22} color={COLORS.primary} />
              <Text
                style={[styles.actionBtnTextWhite, { color: COLORS.primary }]}
              >
                Gallery
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Scan button ── */}
        {imageUri && !result && !loading && (
          <View style={styles.scanBtnWrapper}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={handleScan}
                activeOpacity={0.8}
              >
                <View style={styles.scanBtnInner} />
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.scanBtnLabel}>Tap to analyse</Text>
          </View>
        )}

        {/* ── Result card ── */}
        {result && meta && (
          <View
            style={[
              styles.resultCard,
              { backgroundColor: meta.bg, borderColor: meta.color },
            ]}
          >
            {/* Header row */}
            <View style={styles.resultHeader}>
              <View
                style={[styles.categoryBadge, { backgroundColor: meta.color }]}
              >
                <Text style={styles.categoryBadgeText}>
                  {result.category.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.resultLabel} numberOfLines={2}>
                  {result.label}
                </Text>
                <View
                  style={[styles.confBadge, { backgroundColor: meta.color }]}
                >
                  <Text style={styles.confText}>
                    {(result.confidence * 100).toFixed(1)}% confident
                  </Text>
                </View>
              </View>
            </View>

            {/* Confidence bar */}
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${result.confidence * 100}%` as any,
                    backgroundColor: meta.color,
                  },
                ]}
              />
            </View>

            <ScanAlertBanner
              category={result.category}
              confidence={result.confidence}
              label={result.label}
              timestamp={result.timestamp}
              initialNote={result.notes ?? preSaveObservationNote}
              onUnpersistedNote={setPreSaveObservationNote}
              onNoteSaved={(n) => {
                setResult((r) => (r ? { ...r, notes: n } : r));
                setPendingResult((p) => (p ? { ...p, notes: n } : p));
              }}
            />

            {/* Top-3 */}
            <Text style={styles.top3Title}>Top Predictions</Text>
            {result.top3.map((item, i) => (
              <View key={i} style={styles.top3Row}>
                <Text style={styles.top3Rank}>#{i + 1}</Text>
                <Text style={styles.top3Label} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.top3Conf, { color: meta.color }]}>
                  {((item.confidence || 0) * 100).toFixed(1)}%
                </Text>
              </View>
            ))}

            <View style={styles.redirectContainer}>
              <Ionicons name="checkmark-circle" size={14} color="#6b7280" />
              <Text style={styles.redirectText}>
                Saved — redirecting to Analytics…
              </Text>
            </View>
          </View>
        )}

        {/* ── Scan another ── */}
        {result && (
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <Ionicons name="refresh" size={18} color="#374151" />
            <Text style={styles.resetBtnText}>Scan Another Plant</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Save Modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={handleSkip}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Detection result summary */}
              {pendingResult && (
                <View
                  style={[
                    styles.modalBanner,
                    {
                      backgroundColor:
                        CATEGORY_META[pendingResult.category]?.bg ?? "#f0fdf4",
                      borderColor:
                        CATEGORY_META[pendingResult.category]?.color ??
                        "#22c55e",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      pendingResult.category === "healthy"
                        ? "checkmark-circle"
                        : "warning"
                    }
                    size={22}
                    color={
                      CATEGORY_META[pendingResult.category]?.color ?? "#22c55e"
                    }
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.bannerLabel}>
                      {pendingResult.label}
                    </Text>
                    <Text
                      style={[
                        styles.bannerConf,
                        {
                          color:
                            CATEGORY_META[pendingResult.category]?.color ??
                            "#22c55e",
                        },
                      ]}
                    >
                      {(pendingResult.confidence * 100).toFixed(1)}% confidence
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.modalTitle}>Save Scan Record</Text>
              <Text style={styles.modalSubtitle}>
                Add optional details to this scan before saving.
              </Text>

              {/* Scan name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Scan Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={`e.g., Field A – ${pendingResult?.label ?? "Plant"}`}
                  placeholderTextColor={COLORS.textLight}
                  value={scanName}
                  onChangeText={setScanName}
                  maxLength={60}
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Location, plant age, observations…"
                  placeholderTextColor={COLORS.textLight}
                  value={scanDescription}
                  onChangeText={setScanDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {scanDescription.length}/200
                </Text>
              </View>

              {/* Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.skipBtn]}
                  onPress={handleSkip}
                >
                  <Text style={styles.skipBtnText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveBtnText}>Save & View Analytics</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background ?? "#f8fafc" },

  // Status bar
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 16,
    gap: 6,
  },
  statusText: { fontSize: 11, fontWeight: "600", color: "#fff", flexShrink: 1 },
  retryBtn: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  // Image preview
  previewContainer: {
    width: "100%",
    height: Math.min(height * 0.42, 340),
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
    marginBottom: 18,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  previewImage: { width: "100%", height: "100%" },
  previewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0fdf4",
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textMid ?? "#374151",
  },
  placeholderSub: { fontSize: 13, color: COLORS.textLight ?? "#9ca3af" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  loadingText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  loadingSubText: { color: "rgba(255,255,255,0.75)", fontSize: 13 },

  // Camera / Gallery buttons
  buttonRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 13,
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cameraBtn: { backgroundColor: COLORS.primary ?? "#16a34a" },
  galleryBtn: {
    backgroundColor: "#dcfce7",
    borderWidth: 1.5,
    borderColor: "#86efac",
  },
  actionBtnTextWhite: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Scan button
  scanBtnWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  scanBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.primary ?? "#16a34a",
    elevation: 8,
    shadowColor: COLORS.primary ?? "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  scanBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary ?? "#16a34a",
    opacity: 0.85,
  },
  scanBtnLabel: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textLight ?? "#9ca3af",
    fontWeight: "600",
  },

  // Result card
  resultCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 5,
  },
  confBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  confText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginBottom: 14,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  top3Title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  top3Row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  top3Rank: { width: 28, fontSize: 11, fontWeight: "700", color: "#9ca3af" },
  top3Label: { flex: 1, fontSize: 13, color: "#1f2937", marginLeft: 4 },
  top3Conf: { fontSize: 12, fontWeight: "600" },
  redirectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  redirectText: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
  },

  // Reset button
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  resetBtnText: { fontSize: 15, fontWeight: "700", color: "#374151" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  modalBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  bannerLabel: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  bannerConf: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark ?? "#111827",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMid ?? "#6b7280",
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 14 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark ?? "#111827",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textDark ?? "#111827",
    backgroundColor: "#f9fafb",
  },
  textArea: { height: 90, paddingTop: 11 },
  charCount: {
    fontSize: 11,
    color: COLORS.textLight ?? "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: { backgroundColor: "#f3f4f6" },
  skipBtnText: { fontSize: 14, fontWeight: "700", color: "#6b7280" },
  saveBtn: { backgroundColor: COLORS.primary ?? "#16a34a" },
  saveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
/**
 * Scan.tsx — PathoNet Plant Disease Scanner
 * ─────────────────────────────────────────────────────────────────────────────
 * API:     plant_disease_cnn.py  (Flask /predict  /health)
 * Storage: AsyncStorage only — no Firebase, works fully offline
 * Flow:    Pick/Capture → Scan → Save Modal → Navigate to Analytics tab
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Flask server (run on your machine / Raspberry Pi / cloud VM):
 *   python plant_disease_cnn.py --serve [optional_weights.pt]
 *
 * Endpoints used:
 *   GET  /health  →  { status, model, device }
 *   POST /predict →  { label, category, confidence, class_id, top3 }
 */
