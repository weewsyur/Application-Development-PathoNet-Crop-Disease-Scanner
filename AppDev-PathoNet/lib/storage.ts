import AsyncStorage from "@react-native-async-storage/async-storage";

/** Central keys for PathoNet local persistence (AsyncStorage). */
export const STORAGE_KEYS = {
  SCAN_HISTORY: "scanHistory",
  PATHONET_UID: "pathonet_uid",
  PATHONET_USER_ID: "pathonet_user_id",
  PATHONET_SESSION_ID: "pathonet_session_id",
} as const;

/**
 * Call once when the app starts (e.g. root layout).
 * - Ensures `scanHistory` exists and is a valid JSON array (repairs corrupt/missing data).
 * - Seeds anonymous analytics IDs if absent (same idea as Scan tab, but app-wide).
 *
 * AsyncStorage is ready as soon as the native module loads; this does not require extra
 * native configuration in Expo beyond `@react-native-async-storage/async-storage`.
 */
export async function initializeAsyncStorage(): Promise<void> {
  try {
    const historyRaw = await AsyncStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    if (historyRaw === null) {
      await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, "[]");
    } else {
      try {
        const parsed = JSON.parse(historyRaw) as unknown;
        if (!Array.isArray(parsed)) {
          await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, "[]");
        }
      } catch {
        await AsyncStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, "[]");
      }
    }

    let userId = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_USER_ID);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_USER_ID, userId);
    }

    let sessionId = await AsyncStorage.getItem(STORAGE_KEYS.PATHONET_SESSION_ID);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      await AsyncStorage.setItem(STORAGE_KEYS.PATHONET_SESSION_ID, sessionId);
    }
  } catch (e) {
    console.error("[storage] initializeAsyncStorage:", e);
  }
}
