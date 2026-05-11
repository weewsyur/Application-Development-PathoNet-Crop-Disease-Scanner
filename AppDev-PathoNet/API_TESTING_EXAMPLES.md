# API Testing & Examples

Complete examples for testing and debugging the Flask API connection.

---

## 1. Test Health Endpoint

### From Windows PowerShell

```powershell
# Simple test
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET

# Pretty print response
$response = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET
$response.Content | ConvertFrom-Json | ConvertTo-Json
```

Expected output:
```json
{
  "status": "ok",
  "model": "PlantGuardCNN",
  "classes": 14,
  "device": "CPU",
  "cache_hit_rate": "0%"
}
```

### From Git Bash / WSL

```bash
curl http://localhost:5000/health
```

---

## 2. Test Predict Endpoint with Sample Image

### Option A: Using curl (Linux/Mac/WSL)

```bash
# First, get a base64 encoded image
base64_image=$(base64 < sample_image.jpg)

# Send to API
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d "{\"image\": \"$base64_image\"}"
```

### Option B: Using PowerShell

```powershell
# Read image and convert to base64
$imageBytes = [System.IO.File]::ReadAllBytes("C:\path\to\image.jpg")
$base64 = [System.Convert]::ToBase64String($imageBytes)

# Send to API
$body = @{image = $base64} | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:5000/predict" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

Expected output:
```json
{
  "label": "Healthy",
  "category": "healthy",
  "confidence": 0.92,
  "class_id": 0,
  "top3": [
    {
      "label": "Healthy",
      "confidence": 0.92
    },
    {
      "label": "Fungal: Early Blight",
      "confidence": 0.06
    },
    {
      "label": "Fungal: Late Blight",
      "confidence": 0.02
    }
  ],
  "cached": false
}
```

---

## 3. Test from React Native (Manual Test Code)

### Add this to a test screen or debug component:

```typescript
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";

const API_BASE = "http://10.0.2.2:5000"; // Android emulator

export default function APITestScreen() {
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const log = (msg: string) => {
    setOutput((prev) => prev + msg + "\n");
  };

  const testHealth = async () => {
    setOutput("");
    setLoading(true);
    log("🔍 Testing /health endpoint...");

    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: "GET",
      });
      log(`Status: ${res.status}`);
      const data = await res.json();
      log(JSON.stringify(data, null, 2));
    } catch (e: any) {
      log(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetClasses = async () => {
    setOutput("");
    setLoading(true);
    log("🔍 Testing /classes endpoint...");

    try {
      const res = await fetch(`${API_BASE}/classes`, {
        method: "GET",
      });
      log(`Status: ${res.status}`);
      const data = await res.json();
      log(`Classes: ${data.classes.length}`);
      log(JSON.stringify(data.classes.slice(0, 3), null, 2));
      log("...(more classes)");
    } catch (e: any) {
      log(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testPredictDummy = async () => {
    setOutput("");
    setLoading(true);
    log("🔍 Testing /predict with dummy image...");

    try {
      const dummyBase64 = "/9j/4AAQSkZJRg..."; // Any valid base64

      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 5000);

      log("Sending request...");
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dummyBase64 }),
        signal: ctrl.signal,
      });
      clearTimeout(tid);

      log(`Status: ${res.status}`);
      const data = await res.json();
      log(JSON.stringify(data, null, 2));
    } catch (e: any) {
      log(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNetworkReachability = async () => {
    setOutput("");
    setLoading(true);
    log("🔍 Testing network reachability...");

    try {
      log(`Target: ${API_BASE}`);
      log("Attempting connection...");

      const ctrl = new AbortController();
      const tid = setTimeout(() => {
        log("Timeout: Taking >3 seconds");
        ctrl.abort();
      }, 3000);

      const start = Date.now();
      const res = await fetch(`${API_BASE}/health`, {
        method: "GET",
        signal: ctrl.signal,
      });
      const elapsed = Date.now() - start;
      clearTimeout(tid);

      log(`✓ Connected in ${elapsed}ms`);
      log(`Status: ${res.status}`);
    } catch (e: any) {
      const msg = e.message;
      log(`❌ Connection failed: ${msg}`);

      if (msg.includes("Network")) {
        log("\nLikely causes:");
        log("- Flask not running");
        log("- Wrong IP address");
        log("- Device not on same network");
        log("- Firewall blocking port 5000");
      } else if (msg.includes("aborted")) {
        log("\nLikely causes:");
        log("- Flask server too slow");
        log("- Network latency");
        log("- Timeout too short");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Testing</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.button}
          onPress={testHealth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>1. Health Check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testGetClasses}
          disabled={loading}
        >
          <Text style={styles.buttonText}>2. Get Classes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testPredictDummy}
          disabled={loading}
        >
          <Text style={styles.buttonText}>3. Test Predict (Dummy)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testNetworkReachability}
          disabled={loading}
        >
          <Text style={styles.buttonText}>4. Network Check</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.output}>
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  buttonGroup: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
  output: {
    flex: 1,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  outputText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#333",
  },
});
```

---

## 4. Batch Testing Script

### Create: `test-api.ps1`

```powershell
param(
    [string]$ApiUrl = "http://localhost:5000"
)

Write-Host "🧪 PathoNet API Test Suite" -ForegroundColor Cyan
Write-Host "Testing: $ApiUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Health Check
Write-Host "1️⃣ Health Check"
try {
    $health = Invoke-WebRequest -Uri "$ApiUrl/health" -Method GET
    Write-Host "✓ Status: $($health.StatusCode)" -ForegroundColor Green
    Write-Host ($health.Content | ConvertFrom-Json | ConvertTo-Json -Depth 2) -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Classes
Write-Host "2️⃣ Get Disease Classes"
try {
    $classes = Invoke-WebRequest -Uri "$ApiUrl/classes" -Method GET
    $classData = $classes.Content | ConvertFrom-Json
    Write-Host "✓ Total classes: $($classData.classes.Length)" -ForegroundColor Green
    Write-Host "Classes:" -ForegroundColor Gray
    $classData.classes[0..3] | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Stats
Write-Host "3️⃣ Server Statistics"
try {
    $stats = Invoke-WebRequest -Uri "$ApiUrl/stats" -Method GET
    Write-Host "✓ Stats retrieved:" -ForegroundColor Green
    Write-Host ($stats.Content | ConvertFrom-Json | ConvertTo-Json) -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test suite complete!" -ForegroundColor Green
```

### Run it:

```powershell
.\test-api.ps1 -ApiUrl "http://localhost:5000"
```

---

## 5. Performance Testing

### Test Response Times

```typescript
const testPerformance = async (imageBase64: string) => {
  const iterations = 5;
  const times: number[] = [];

  console.log(`[PERF] Running ${iterations} predictions...`);

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const data = await res.json();
      const elapsed = Date.now() - start;
      times.push(elapsed);

      console.log(`  [${i + 1}/${iterations}] ${elapsed}ms (${data.cached ? "cached" : "fresh"})`);
    } catch (e) {
      console.error(`  [${i + 1}/${iterations}] Failed:`, e);
    }
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`[PERF] Results:`);
  console.log(`  Average: ${avg.toFixed(0)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);
};
```

---

## 6. Error Simulation Testing

### Simulate Common Errors

```typescript
// Test timeout
const testTimeout = async () => {
  console.log("[TEST] Simulating timeout...");
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 100); // Very short timeout

  try {
    await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "test" }),
      signal: ctrl.signal,
    });
  } catch (e: any) {
    console.log("[TEST] Expected error:", e.message);
  }
  clearTimeout(tid);
};

// Test network error
const testNetworkError = async () => {
  console.log("[TEST] Simulating network error...");
  try {
    await fetch("http://999.999.999.999:5000/health");
  } catch (e: any) {
    console.log("[TEST] Expected error:", e.message);
  }
};

// Test invalid response
const testInvalidResponse = async () => {
  console.log("[TEST] Testing with invalid base64...");
  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "not-valid-base64!!!" }),
    });
    const data = await res.json();
    console.log("[TEST] Response:", data);
  } catch (e: any) {
    console.log("[TEST] Expected error:", e.message);
  }
};
```

---

## 7. Integration with CI/CD

### GitHub Actions Example

Create `.github/workflows/test-api.yml`:

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        pip install flask flask-cors torch torchvision pillow
    
    - name: Start Flask server
      run: |
        python run_api_server.py &
        sleep 3  # Wait for server to start
    
    - name: Test health endpoint
      run: |
        curl -f http://localhost:5000/health || exit 1
    
    - name: Test classes endpoint
      run: |
        curl -f http://localhost:5000/classes || exit 1
```

---

## Tips for Effective Testing

1. **Always test health first** → confirms server is running
2. **Test classes endpoint** → confirms model is loaded
3. **Use small images** → debug faster without network overhead
4. **Enable debug logs** → see detailed error messages
5. **Test from device** → real-world conditions
6. **Monitor Flask console** → see server-side errors
7. **Check network stability** → use ping to test connectivity

---

## Next Steps

1. Run the health check: `curl http://localhost:5000/health`
2. Use test-api.ps1 for comprehensive testing
3. Add the test screen to your app for debugging
4. Monitor both Expo and Flask logs during testing
5. Refer to [API_DEBUGGING_GUIDE.md](./API_DEBUGGING_GUIDE.md) if issues persist

Good luck! 🧪🌱
