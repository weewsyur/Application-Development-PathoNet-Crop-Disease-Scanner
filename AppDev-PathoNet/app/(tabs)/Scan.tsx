import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { memo } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Camera, Images, Leaf, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
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
import {
  checkApiHealth,
  getApiBaseUrl,
  detectEnvironment,
} from "@/services/api-local";
import { pathoNetSimpleClient, type LocalPredictionResult, type LocalScanRecord } from "@/utils/pathonetClientSimple";

const { height } = Dimensions.get("window");

// ─── API Configuration (Centralized) ─────────────────────────────────────────────
const API_BASE = getApiBaseUrl();
const ENVIRONMENT = detectEnvironment();

// Log API configuration for debugging
console.log("[Scan] API Configuration:", {
  API_BASE,
  ENVIRONMENT,
  Platform: Platform.OS,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalContentProps {
  pendingResult: ScanRecord | null;
  scanName: string;
  scanDescription: string;
  setScanName: (value: string) => void;
  setScanDescription: (value: string) => void;
  handleSkip: () => void;
  handleSave: () => void;
}

const ModalContent = memo(function ModalContent({
  pendingResult,
  scanName,
  scanDescription,
  setScanName,
  setScanDescription,
  handleSkip,
  handleSave,
}: ModalContentProps) {
  return (
    <>
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
          <CheckCircle
            size={24}
            color={pendingResult.category === "healthy" ? COLORS.success : COLORS.warning}
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
              {`${(pendingResult.confidence * 100).toFixed(1)}% confidence`}
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
    </>
  );
});

ModalContent.displayName = "ModalContent";
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

  // Debug logging
  useEffect(() => {
    console.log("[Scan] modalVisible changed:", modalVisible, "Platform:", Platform.OS);
    console.log("[Scan] pendingResult:", pendingResult?.label);
  }, [modalVisible, pendingResult]);

  // Analytics identifiers
  const [userId, setUserId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [serverHealth, setServerHealth] = useState<"checking" | "online" | "offline">("checking");

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Initialize local ML client - no API health check needed
    const initLocalML = async () => {
      try {
        await pathoNetSimpleClient.loadModel();
        setServerHealth("online"); // Local ML is always "online"
        console.log("[Scan] Local ML client initialized successfully");
      } catch (error) {
        setServerHealth("offline");
        console.warn("[Scan] Local ML initialization failed:", error);
      }
    };

    // Generate or load user ID and session ID for analytics
    const initAnalyticsIds = async () => {
      try {
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
      } catch (e) {
        console.error("[Scan] initAnalyticsIds error:", e);
      }
    };

    loadHistory().catch(e => console.error("[Scan] loadHistory error:", e));
    initAnalyticsIds();
    initLocalML();
    // Sync from Firestore in background
    syncFromFirestore().catch(e => console.error("[Scan] syncFromFirestore error:", e));
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

  // ── Call Local PathoNet Client (No API needed) ─────────────────────────────────────
  const callCnnApi = useCallback(async (base64Image: string): Promise<ScanRecord> => {
    console.log("[Scan] Local ML Request Details:", {
      platform: Platform.OS,
      hasImage: !!base64Image,
      imageSize: base64Image?.length,
      userId,
      sessionId,
      usingLocalClient: true
    });

    try {
      // Convert base64 to image element for local processing
      const imageElement = await base64ToImageElement(base64Image);

      // Use local PathoNet client for prediction
      const prediction: LocalPredictionResult = await pathoNetSimpleClient.predict(imageElement);

      // Create scan record from local prediction
      const localRecord: LocalScanRecord = pathoNetSimpleClient.createScanRecord(
        imageUri || '',
        prediction,
        userId,
        sessionId
      );

      // Map local record to ScanRecord format
      const record: ScanRecord = {
        label: prediction.diseaseName,
        category: prediction.category as any,
        confidence: prediction.confidence,
        class_id: 0, // Local client doesn't provide class_id
        top3: [], // Local client provides single prediction
        timestamp: new Date(localRecord.timestamp).toISOString(),
        imageUri: imageUri || undefined,
      };

      console.log("[Scan] Local ML Prediction complete:", record);
      return record;

    } catch (err: any) {
      console.error("[Scan] Local ML prediction failed:", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });

      // For local ML, we don't need complex network error handling
      throw new Error(`Local ML prediction failed: ${err?.message || 'Unknown error'}`);
    }
  }, [userId, sessionId, imageUri]);

  // Helper function to convert base64 to image element (React Native)
  const base64ToImageElement = async (base64: string): Promise<any> => {
    // For React Native, we'll create a mock image object with basic properties
    return new Promise((resolve) => {
      // Extract image dimensions from base64 (simplified)
      const mockImage = {
        width: 224, // Standard ML input size
        height: 224,
        uri: base64
      };
      resolve(mockImage);
    });
  };

  // ── Image-picker helpers ──────────────────────────────────────────────────
  const handleAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.uri || !asset.base64) {
      Alert.alert("Error", "Could not read image data. Please try again.");
      return;
    }

    const mime = asset.mimeType?.toLowerCase();
    const allowed = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);
    if (mime && !allowed.has(mime)) {
      Alert.alert("Unsupported image type", "Please use a JPEG or PNG photo.");
      return;
    }

    // Validate base64 data is not empty
    if (asset.base64.length === 0) {
      Alert.alert("Error", "Image data is empty. Please try again.");
      return;
    }

    // Validate image size is reasonable (at least 1KB)
    if (asset.base64.length < 1000) {
      Alert.alert("Error", "Image is too small. Please select a larger image.");
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
      quality: 0.5, // Reduced to 0.5 for faster loading on low-end devices
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
      quality: 0.5, // Reduced to 0.5 for faster loading on low-end devices
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

    // Reset states before scan
    setResult(null);
    setPendingResult(null);
    setModalVisible(false);

    try {
      setLoading(true);
      console.log("[Scan] Starting scan with local ML");
      console.log("[Scan] Image info:", { hasUri: !!imageUri, b64Length: imageB64?.length });

      const record = await callCnnApi(imageB64);

      console.log("[Scan] Scan successful, result:", {
        label: record.label,
        confidence: record.confidence,
        category: record.category,
      });

      // Only set result and show modal on successful scan
      setResult(record);
      setPendingResult(record);

      // Use setTimeout to ensure state updates are batched and modal renders after result
      setTimeout(() => {
        console.log("[Scan] Setting modalVisible to true");
        setModalVisible(true);
      }, 100);

    } catch (err: any) {
      console.error("[Scan] Scan failed:", {
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });

      // Ensure modal doesn't open on error
      setModalVisible(false);
      setResult(null);
      setPendingResult(null);

      let msg = err?.message ?? "Scan failed. Please check your connection and try again.";
      let showRetry = true;

      // Handle validation errors with user-friendly messages
      if (msg.startsWith("VALIDATION_ERROR:")) {
        const parts = msg.split(":");
        const code = parts[1] || "INVALID_SCAN";
        const userMessage = parts.slice(2).join(":") || "Invalid scan. Please try with a clearer photo.";

        msg = userMessage;

        // Don't show retry button for validation errors - user needs to take a new photo
        showRetry = false;

        if (code === "NOT_A_PLANT") {
          msg = "This doesn't appear to be a plant image. Please take a photo of a plant leaf.";
        } else if (code === "BLURRY") {
          msg = "The photo is too blurry. Please take a clearer photo.";
        } else if (code === "INVALID_SCAN" || code === "DECODE_FAILED" || code === "EMPTY_IMAGE") {
          msg =
            code === "EMPTY_IMAGE"
              ? "No image data. Please pick the photo again."
              : code === "DECODE_FAILED"
                ? "The image could not be read. Try another photo or format (JPEG/PNG)."
                : "Invalid scan. Please ensure the photo shows a clear plant leaf.";
        }
      } else if (msg.startsWith("SERVER_ERROR:")) {
        const userMessage = msg.split(":").slice(1).join(":") || "Server error occurred. Please try again.";
        msg = userMessage;
        // Show retry button for server errors
        showRetry = true;
      } else if (err?.name === "AbortError") {
        msg = "Request timed out. Is the PathoNetV1 server running?";
      }

      const buttons: Array<{ text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }> = [{ text: "OK", style: "default" }];
      if (showRetry) {
        buttons.push({ text: "Retry", style: "default", onPress: () => handleScan() });
      }

      Alert.alert("Scan Error", msg, buttons);
    } finally {
      setLoading(false);
    }
  }, [imageUri, imageB64, scaleAnim, callCnnApi]);

  // ── Modal — save then navigate to Analytics ───────────────────────────────
  const commitAndNavigate = useCallback(async (name: string, description: string) => {
    console.log("[Scan] commitAndNavigate called, pendingResult:", pendingResult?.label);
    if (!pendingResult) {
      console.error("[Scan] commitAndNavigate: No pendingResult!");
      return;
    }

    const noteTrim = preSaveObservationNote.trim();
    const finalRecord: ScanRecord = {
      ...pendingResult,
      scanName: name.trim() || `${pendingResult.label} Scan`,
      scanDescription: description.trim(),
      ...(noteTrim ? { notes: noteTrim } : {}),
    };

    console.log("[Scan] Closing modal and navigating to ScanDetails");
    setModalVisible(false);
    setScanName("");
    setScanDescription("");
    setPreSaveObservationNote("");

    await saveRecord(finalRecord);
    console.log("[Scan] Record saved, navigating to ScanDetails");

    // Navigate to ScanDetails to view post-scan details
    router.push({
      pathname: "/ScanDetails",
      params: { scan: JSON.stringify(finalRecord) }
    } as any);
  }, [pendingResult, preSaveObservationNote, router]);

  const handleSave = useCallback(() => {
    console.log("[Scan] handleSave pressed");
    commitAndNavigate(scanName, scanDescription);
  }, [commitAndNavigate, scanName, scanDescription]);

  const handleSkip = useCallback(() => {
    console.log("[Scan] handleSkip pressed");
    commitAndNavigate("", "");
  }, [commitAndNavigate]);

  // ── Reset to scan again ───────────────────────────────────────────────────
  const reset = useCallback(() => {
    setImageUri(null);
    setImageB64(null);
    setResult(null);
    setPendingResult(null);
    setPreSaveObservationNote("");
  }, []);

  const meta = useMemo(() => result ? CATEGORY_META[result.category] : null, [result]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AppHeader />

      {/* Local ML indicator - always healthy */}
      {serverHealth === "online" && (
        <View style={styles.localMLBanner}>
          <CheckCircle size={20} color="#22c55e" />
          <Text style={styles.localMLText}>
            Local ML ready - instant predictions
          </Text>
        </View>
      )}

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
              <Leaf size={52} color={COLORS.primary} />
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
              <Camera size={22} color="#fff" />
              <Text style={styles.actionBtnTextWhite}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.galleryBtn]}
              onPress={pickFromGallery}
              activeOpacity={0.85}
            >
              <Images size={22} color={COLORS.primary} />
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
        {result && meta && !modalVisible && (
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
                    {`${(result.confidence * 100).toFixed(1)}% confident`}
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
                  {`${((item.confidence || 0) * 100).toFixed(1)}%`}
                </Text>
              </View>
            ))}

            <View style={styles.redirectContainer}>
              <CheckCircle size={14} color="#6b7280" />
              <Text style={styles.redirectText}>
                Saved — redirecting to Analytics…
              </Text>
            </View>
          </View>
        )}

        {/* ── Scan another ── */}
        {result && (
          <TouchableOpacity style={styles.resetBtn} onPress={reset}>
            <RefreshCw size={18} color="#374151" />
            <Text style={styles.resetBtnText}>Scan Another Plant</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Save Modal ── */}
      {Platform.OS === "web" ? (
        // Web: Use absolute positioning overlay
        modalVisible && (
          <View style={styles.webModalOverlay}>
            <View style={styles.modalContent}>
              <ModalContent
                pendingResult={pendingResult}
                scanName={scanName}
                scanDescription={scanDescription}
                setScanName={setScanName}
                setScanDescription={setScanDescription}
                handleSkip={handleSkip}
                handleSave={handleSave}
              />
            </View>
          </View>
        )
      ) : (
        // Native (iOS/Android): Use Modal component
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={handleSkip}
          statusBarTranslucent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ModalContent
                pendingResult={pendingResult}
                scanName={scanName}
                scanDescription={scanDescription}
                setScanName={setScanName}
                setScanDescription={setScanDescription}
                handleSkip={handleSkip}
                handleSave={handleSave}
              />
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background ?? "#f8fafc",
  },

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

  // Local ML banner
  localMLBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  localMLText: {
    flex: 1,
    fontSize: 13,
    color: "#16a34a",
    fontWeight: "500",
  },

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
  webModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    maxWidth: 500,
    width: "90%",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
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
