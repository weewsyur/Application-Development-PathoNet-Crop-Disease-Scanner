/**
 * PathoNet API Configuration
 * 
 * Centralized API configuration with environment auto-detection
 * Supports: web, android emulator, physical device, production/Vercel
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Environment Detection ─────────────────────────────────────────────────────

export type Environment = 'web' | 'android-emulator' | 'android-device' | 'ios-simulator' | 'ios-device' | 'production';

export function detectEnvironment(): Environment {
  // Check if running in production (Vercel, etc.)
  if (process.env.NODE_ENV === 'production' && !__DEV__) {
    return 'production';
  }

  // Web
  if (Platform.OS === 'web') {
    return 'web';
  }

  // Android
  if (Platform.OS === 'android') {
    // Check if running in emulator
    const isEmulator = Constants.platform?.android?.isEmulator ?? false;
    return isEmulator ? 'android-emulator' : 'android-device';
  }

  // iOS
  if (Platform.OS === 'ios') {
    // Check if running in simulator
    const isSimulator = Constants.platform?.ios?.isSimulator ?? false;
    return isSimulator ? 'ios-simulator' : 'ios-device';
  }

  return 'web'; // Default fallback
}

// ─── API URL Configuration ─────────────────────────────────────────────────────

export function getApiBaseUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim();
  const environment = detectEnvironment();

  // If EXPO_PUBLIC_API_URL is set and not localhost on native, use it
  if (env && !env.includes('localhost') && !env.includes('127.0.0.1')) {
    return env;
  }

  // Production environment
  if (environment === 'production') {
    const productionUrl = process.env.EXPO_PUBLIC_PRODUCTION_API_URL || env;
    if (!productionUrl) {
      console.warn('[API] No production API URL configured. Using fallback.');
    }
    return productionUrl || 'https://api.pathonet.example.com';
  }

  // Web development
  if (environment === 'web') {
    return env || 'http://localhost:5000';
  }

  // Android emulator
  if (environment === 'android-emulator') {
    return 'http://10.0.2.2:5000';
  }

  // iOS simulator
  if (environment === 'ios-simulator') {
    return 'http://localhost:5000';
  }

  // Physical devices - use Expo host LAN IP or fallback
  if (environment === 'android-device' || environment === 'ios-device') {
    const hostUri = Constants.expoConfig?.hostUri;
    const expoHost = hostUri ? hostUri.split(':')[0] : undefined;

    if (expoHost && !expoHost.includes('localhost') && !expoHost.includes('127.0.0.1')) {
      return `http://${expoHost}:5000`;
    }

    // Fallback to env var or warn
    if (env && !env.includes('localhost') && !env.includes('127.0.0.1')) {
      return env;
    }

    console.warn(
      '[API] Physical device detected but no valid API URL configured.',
      'Set EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:5000'
    );
    return 'http://localhost:5000'; // Will fail, but provides clear error
  }

  return 'http://localhost:5000';
}

// ─── API Endpoints ─────────────────────────────────────────────────────────────

export const API_ENDPOINTS = {
  HEALTH: '/health/v2',
  HEALTH_LEGACY: '/health',
  PREDICT_V2: '/predict/v2',
  VALIDATE: '/validate',
  BENCHMARK: '/benchmark',
} as const;

// ─── API Configuration ─────────────────────────────────────────────────────────

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: getApiBaseUrl(),
  timeout: 25000, // 25 seconds for low-end devices
  retries: 2,
  retryDelay: 1000, // 1 second between retries
  headers: {
    'Content-Type': 'application/json',
  },
};

// ─── Build Full URL ───────────────────────────────────────────────────────────

export function buildUrl(endpoint: string, baseUrl?: string): string {
  const base = baseUrl || DEFAULT_API_CONFIG.baseUrl;
  return `${base}${endpoint}`;
}

// ─── Retry Logic ─────────────────────────────────────────────────────────────

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  config: Partial<ApiConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_API_CONFIG, ...config };
  const { timeout, retries, retryDelay } = finalConfig;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...finalConfig.headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'unknown error');
        const error = new Error(`API responded ${response.status}: ${errorText}`);

        // Don't retry on validation errors (422) - these are client-side issues
        if (response.status === 422) {
          throw error;
        }

        throw error;
      }

      const okText = await response.text().catch(() => '');
      try {
        return okText ? (JSON.parse(okText) as T) : ({} as T);
      } catch {
        throw new Error(`Invalid JSON (${response.status}): ${okText.slice(0, 200)}`);
      }
    } catch (error: any) {
      lastError = error;

      // Don't retry on abort errors (timeout) or certain status codes
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }

      // If this was the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      console.warn(`[API] Retry ${attempt + 1}/${retries} for ${url}`);
    }
  }

  throw lastError || new Error('Unknown error in fetchWithRetry');
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  try {
    const url = buildUrl(API_ENDPOINTS.HEALTH, baseUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isHealthy = response.ok;

    if (!isHealthy) {
      console.warn('[API] Health check failed:', response.status);
    }

    return isHealthy;
  } catch (error) {
    console.warn('[API] Health check error:', error);
    return false;
  }
}

// ─── Prediction API ───────────────────────────────────────────────────────────

export interface PredictionRequest {
  image: string; // base64
  use_tta?: boolean;
  user_id?: string;
  session_id?: string;
}

export interface PredictionResponse {
  success: boolean;
  crop?: string;
  disease?: string;
  label?: string;
  confidence?: number;
  is_healthy?: boolean;
  severity?: string;
  top3?: Array<{ label: string; confidence: number }>;
  summary_en?: string;
  action_en?: string;
  error?: string;
  message?: string;
  /** Server v2 field (validation + INTERNAL_ERROR) */
  error_code?: string;
  /** Legacy / alternate key some gateways mirror */
  code?: string;
  quality_score?: number; // Image quality score from validation
}

/** Normalize v2 API error key (Flask uses `error_code`; older docs used `code`). */
export function getPredictionErrorCode(res: PredictionResponse): string | undefined {
  return res.error_code || res.code;
}

/** Strip data-URL prefix and whitespace so Python `b64decode` accepts the payload. */
export function normalizeImageBase64(raw: string): string {
  const s = (raw ?? "").trim();
  const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/s.exec(s);
  const payload = m ? m[1] : s;
  return payload.replace(/\s/g, "");
}

function safeJsonParse<T>(text: string): { ok: true; value: T } | { ok: false } {
  const t = text.trim();
  if (!t) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(t) as T };
  } catch {
    return { ok: false };
  }
}

/** Validation-style codes from PathoNetV1 pipeline (do not offer scan retry for these). */
const PREDICT_VALIDATION_ERROR_CODES = new Set([
  "NOT_A_PLANT",
  "BLURRY",
  "TOO_SMALL",
  "FEATURELESS",
  "DECODE_FAILED",
]);

export function isPredictionValidationFailure(res: PredictionResponse): boolean {
  const code = getPredictionErrorCode(res);
  if (res.error === "INVALID_SCAN") return true;
  if (code && PREDICT_VALIDATION_ERROR_CODES.has(code)) return true;
  if (code === "EMPTY_IMAGE") return true;
  return false;
}

export async function predictImage(
  request: PredictionRequest,
  userId?: string,
  sessionId?: string,
  config?: Partial<ApiConfig>
): Promise<PredictionResponse> {
  const finalConfig = { ...DEFAULT_API_CONFIG, ...config };
  const url = buildUrl(API_ENDPOINTS.PREDICT_V2, finalConfig.baseUrl);

  const normalized = normalizeImageBase64(request.image);
  if (!normalized) {
    return {
      success: false,
      error: "CLIENT",
      error_code: "EMPTY_IMAGE",
      message: "No image data to send. Please select a photo again.",
    };
  }

  const payload: PredictionRequest = { ...request, image: normalized };
  const logPayload = { ...payload, image: `[base64 ${normalized.length} chars]` };
  console.log("Request Payload:", logPayload);

  const headers: Record<string, string> = {
    ...finalConfig.headers,
    ...(userId ? { "X-User-ID": userId } : {}),
    ...(sessionId ? { "X-Session-ID": sessionId } : {}),
  };

  const maxAttempts = 1 + finalConfig.retries;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseText = await response.text().catch(() => "");
      console.log("Response Status:", response.status);
      console.log(
        "Response Body:",
        responseText.length > 4000 ? `${responseText.slice(0, 4000)}…[truncated]` : responseText
      );

      const parsed = safeJsonParse<PredictionResponse>(responseText);

      if (!parsed.ok) {
        const retryNonJson =
          attempt < maxAttempts - 1 &&
          (response.status >= 500 ||
            response.status === 429 ||
            (response.status === 422 && responseText.includes("INTERNAL_ERROR")));
        if (retryNonJson) {
          await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
          console.warn(`[API] predict retry ${attempt + 1}/${maxAttempts} (unparseable body)`);
          continue;
        }
        throw new Error(`MALFORMED_RESPONSE:${response.status}:${responseText.slice(0, 240)}`);
      }

      const data = parsed.value;

      if (typeof data.success !== "boolean") {
        if (attempt < maxAttempts - 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
          continue;
        }
        throw new Error(`MALFORMED_RESPONSE:${response.status}:missing success flag`);
      }

      if (response.ok && data.success) {
        return data;
      }

      if (data.success !== true) {
        const code = getPredictionErrorCode(data);
        const retryFailure =
          attempt < maxAttempts - 1 &&
          (code === "INTERNAL_ERROR" || (response.status >= 500 && response.status < 600));
        if (retryFailure) {
          await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
          console.warn(
            `[API] predict retry ${attempt + 1}/${maxAttempts} (${code || response.status})`
          );
          continue;
        }
        return data;
      }

      if (!response.ok) {
        if (attempt < maxAttempts - 1 && (response.status >= 500 || response.status === 429)) {
          await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
          continue;
        }
        throw new Error(`API responded ${response.status}: ${responseText.slice(0, 300)}`);
      }

      return data;
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === "AbortError") {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
          console.warn(`[API] predict retry ${attempt + 1}/${maxAttempts} (timeout)`);
          continue;
        }
        throw new Error(`Request timed out after ${finalConfig.timeout}ms`);
      }
      const msg = String(e?.message ?? e);
      const isNetwork =
        msg.includes("Failed to fetch") ||
        msg.includes("Network request failed") ||
        e?.code === "ECONNABORTED";
      if (isNetwork && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, finalConfig.retryDelay));
        console.warn(`[API] predict retry ${attempt + 1}/${maxAttempts} (network)`);
        continue;
      }
      throw e;
    }
  }

  throw new Error("Prediction failed after retries");
}

// ─── Validation API ───────────────────────────────────────────────────────────

export interface ValidationRequest {
  image: string; // base64
}

export interface ValidationResponse {
  success: boolean;
  is_valid: boolean;
  issues: string[];
  error?: string;
}

export async function validateImage(
  request: ValidationRequest,
  config?: Partial<ApiConfig>
): Promise<ValidationResponse> {
  const url = buildUrl(API_ENDPOINTS.VALIDATE);
  const normalized = normalizeImageBase64(request.image);
  const body = JSON.stringify({ ...request, image: normalized || request.image });

  return fetchWithRetry<ValidationResponse>(url, {
    method: 'POST',
    body,
  }, config);
}

// ─── Export API Info for Debugging ─────────────────────────────────────────────

export function getApiInfo() {
  const environment = detectEnvironment();
  const baseUrl = getApiBaseUrl();

  return {
    environment,
    baseUrl,
    endpoints: API_ENDPOINTS,
    config: DEFAULT_API_CONFIG,
  };
}

// Log API configuration on import (development only)
if (__DEV__) {
  console.log('[API] Configuration:', getApiInfo());
}

export default {
  detectEnvironment,
  getApiBaseUrl,
  buildUrl,
  fetchWithRetry,
  checkApiHealth,
  predictImage,
  validateImage,
  getApiInfo,
  getPredictionErrorCode,
  normalizeImageBase64,
  isPredictionValidationFailure,
  API_ENDPOINTS,
  DEFAULT_API_CONFIG,
};
