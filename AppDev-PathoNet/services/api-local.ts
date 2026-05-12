/**
 * Local ML API Services - No External API Calls
 * PathoNetV1.py logic embedded directly in the web app
 */

// ─── Environment Detection ─────────────────────────────────────────────────────

export function detectEnvironment(): string {
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'web';
  }
  return 'production';
}

// ─── API URL Configuration ─────────────────────────────────────────────────────

export function getApiBaseUrl(): string {
  // Local ML - no API URL needed
  return 'local';
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  // Local ML is always "healthy" - no API calls needed
  console.log('[API] Local ML health check - always healthy');
  return true;
}

// ─── Local ML Types ───────────────────────────────────────────────────────────

export interface LocalPredictionRequest {
  image: string; // base64
  confidence_threshold?: number;
}

export interface LocalPredictionResponse {
  success: boolean;
  label?: string;
  category?: string;
  confidence?: number;
  diseaseName?: string;
  recommendations?: string[];
  color?: string;
  error?: string;
  message?: string;
}

// ─── Export Functions for Compatibility ─────────────────────────────────────

export const API_ENDPOINTS = {
  HEALTH_LOCAL: 'local',
  PREDICT_LOCAL: 'local',
  VALIDATE_LOCAL: 'local',
} as const;

export function getApiInfo() {
  const environment = detectEnvironment();
  const baseUrl = getApiBaseUrl();

  return {
    environment,
    baseUrl,
    endpoints: API_ENDPOINTS,
    mode: 'local-ml'
  };
}

// Log configuration on import (development only)
if (typeof window !== 'undefined' && (window as any).__DEV__) {
  console.log('[API] Local ML Configuration:', getApiInfo());
}

export default {
  detectEnvironment,
  getApiBaseUrl,
  checkApiHealth,
  getApiInfo,
  API_ENDPOINTS,
};
