# 📡 Using the API in Your Expo App

Once both services are running, here's how to call your Python API from your Expo app.

---

## 🔗 API Base URL

The API runs on: `http://localhost:5000`

### For Different Platforms:

| Platform             | URL                              |
| -------------------- | -------------------------------- |
| Web/Browser          | `http://localhost:5000`          |
| iOS Simulator        | `http://localhost:5000`          |
| Android Emulator     | `http://10.0.2.2:5000`           |
| Android Device (USB) | `http://<YOUR_COMPUTER_IP>:5000` |
| iPhone Device        | `http://<YOUR_COMPUTER_IP>:5000` |

---

## 🛠️ Setup: Environment Variables

Create `.env` in your `AppDev-PathoNet/` folder:

```env
REACT_APP_API_URL=http://localhost:5000
```

Then create a config file:

### File: `app/config/api.ts`

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || "http://localhost:5000",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

export const ENDPOINTS = {
  HEALTH: "/health",
  PREDICT: "/predict",
  CLASSES: "/classes",
  TRAIN: "/train",
};
```

---

## 💻 Creating an API Service

### File: `app/services/api.ts`

```typescript
import { API_CONFIG, ENDPOINTS } from "../config/api";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiService {
  private baseUrl: string = API_CONFIG.BASE_URL;

  /**
   * Check if API is healthy
   */
  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.HEALTH}`, {
        method: "GET",
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Predict plant disease from image
   * @param imageBase64 Base64 encoded image data
   * @returns Prediction result
   */
  async predictDisease(imageBase64: string): Promise<
    ApiResponse<{
      disease: string;
      confidence: number;
      description?: string;
    }>
  > {
    try {
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.PREDICT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: imageBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Prediction failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get list of plant disease classes
   */
  async getClasses(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}${ENDPOINTS.CLASSES}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Failed to get classes:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export default new ApiService();
```

---

## 📱 Using in Your Scan Component

### Updated: `app/(tabs)/Scan.tsx`

```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import apiService from '../services/api';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTakePicture = async () => {
    try {
      setLoading(true);

      // Simulate taking a photo (in real app, use camera)
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        // Send to API
        const prediction = await apiService.predictDisease(
          result.assets[0].base64
        );

        if (prediction.success && prediction.data) {
          setResult(prediction.data);
          Alert.alert(
            'Prediction',
            `Disease: ${prediction.data.disease}\nConfidence: ${(
              prediction.data.confidence * 100
            ).toFixed(2)}%`
          );
        } else {
          Alert.alert('Error', prediction.error || 'Prediction failed');
        }
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <>
          <TouchableOpacity
            onPress={handleTakePicture}
            style={{
              padding: 20,
              backgroundColor: '#007AFF',
              borderRadius: 8,
            }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>
              Scan Plant 📸
            </Text>
          </TouchableOpacity>

          {result && (
            <View style={{ marginTop: 20 }}>
              <Text>Disease: {result.disease}</Text>
              <Text>Confidence: {(result.confidence * 100).toFixed(2)}%</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
```

---

## 🔄 Retry Logic

Add automatic retry for failed requests:

### File: `app/services/api-retry.ts`

```typescript
import apiService from "./api";

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error("Max retry attempts reached");
}

// Usage:
const result = await withRetry(() => apiService.predictDisease(imageBase64));
```

---

## 🎯 Using Different Platforms

### For Android Emulator

```typescript
// app/config/api.ts
const BASE_URL =
  Platform.OS === "android" && !__DEV__
    ? "http://10.0.2.2:5000" // Android emulator
    : "http://localhost:5000"; // iOS simulator or web

export const API_CONFIG = {
  BASE_URL,
  TIMEOUT: 30000,
};
```

### For Physical Devices

Find your computer IP:

**Windows:**

```powershell
ipconfig
# Look for "IPv4 Address" under your network connection
# Example: 192.168.1.100
```

**macOS/Linux:**

```bash
ifconfig
# Look for inet address
# Example: 192.168.1.100
```

Then update your config:

```typescript
// app/config/api.ts
export const API_CONFIG = {
  BASE_URL: "http://192.168.1.100:5000", // Replace with your IP
  TIMEOUT: 30000,
};
```

---

## 🛡️ Error Handling

```typescript
async function predictWithErrorHandling(imageBase64: string) {
  try {
    // Check if API is available
    const isHealthy = await apiService.health();
    if (!isHealthy) {
      throw new Error("API server is not responding");
    }

    // Make prediction
    const result = await apiService.predictDisease(imageBase64);

    if (!result.success) {
      throw new Error(result.error || "Prediction failed");
    }

    return result.data;
  } catch (error) {
    console.error("Prediction error:", error);
    throw error;
  }
}
```

---

## 📊 API Endpoints Reference

### Health Check

```
GET /health
Response: { status: "ok" }
```

### Predict Disease

```
POST /predict
Body: { image: "base64_string" }
Response: {
  disease: "Powdery Mildew",
  confidence: 0.95,
  description: "Description of the disease..."
}
```

### Get Classes

```
GET /classes
Response: [
  "Powdery Mildew",
  "Rust",
  "Leaf Spot",
  ...
]
```

---

## 🧪 Testing the API

### Using cURL

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test classes endpoint
curl http://localhost:5000/classes

# Test prediction (with sample image)
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image_here"}'
```

### Using Postman

1. Create new request
2. Method: POST
3. URL: `http://localhost:5000/predict`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):

```json
{
  "image": "your_base64_image_here"
}
```

---

## 🔗 Connecting Image Picker to API

```typescript
import * as ImagePicker from "expo-image-picker";

async function pickAndSendImage() {
  // Pick image from library
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
    base64: true, // Get base64 data
  });

  if (!result.canceled && result.assets[0].base64) {
    // Send to API
    const prediction = await apiService.predictDisease(result.assets[0].base64);
    console.log("Prediction:", prediction);
  }
}
```

---

## 📱 Persisting Results

Store predictions in local storage:

```typescript
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PredictionResult {
  id: string;
  timestamp: number;
  imageUri: string;
  disease: string;
  confidence: number;
}

async function savePrediction(prediction: PredictionResult) {
  try {
    const existing = await AsyncStorage.getItem("predictions");
    const predictions = existing ? JSON.parse(existing) : [];
    predictions.push(prediction);
    await AsyncStorage.setItem("predictions", JSON.stringify(predictions));
  } catch (error) {
    console.error("Failed to save prediction:", error);
  }
}

async function getPredictionHistory() {
  try {
    const predictions = await AsyncStorage.getItem("predictions");
    return predictions ? JSON.parse(predictions) : [];
  } catch (error) {
    console.error("Failed to get predictions:", error);
    return [];
  }
}
```

---

## 🚀 Next Steps

1. Set up the API service (`app/services/api.ts`)
2. Configure API URL (`app/config/api.ts`)
3. Update your Scan component to use the service
4. Test with `npm start`
5. Check API responses in console

Good luck! 🌱
