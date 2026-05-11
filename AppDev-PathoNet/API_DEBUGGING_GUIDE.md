# Expo App ↔ Flask API Debugging Guide

## Current Issue: "Scan Failed - Aborted"

The "Aborted" error typically means the fetch request was **aborted due to timeout or network unreachability**. This guide helps diagnose and fix the connection.

---

## Quick Checklist

- [ ] Flask server is running (`python run_api_server.py`)
- [ ] Flask shows "PlantGuard API running on http://0.0.0.0:5000"
- [ ] Device/emulator can reach the correct API URL
- [ ] No firewall blocking port 5000
- [ ] Using correct IP address (not localhost for physical devices)

---

## 1. Start the Flask Server

### Option A: From Python Virtual Environment (Recommended)

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Navigate to project
cd AppDev-PathoNet

# Run API server
python run_api_server.py
```

**Expected output:**
```
======================================================================
  🌱 PathoNet Disease Detection API Server
======================================================================

✓ Starting Flask server on http://localhost:5000
✓ Health check:  GET  http://localhost:5000/health
✓ Predictions:   POST http://localhost:5000/predict
✓ Classes:       GET  http://localhost:5000/classes

Press Ctrl+C to stop the server.

=======================================================
  PlantGuard CNN — Architecture Summary
=======================================================
  ...
  
PlantGuard API running on http://0.0.0.0:5000
Device: CPU
Workers: 4 (concurrent request handling)
```

If you see errors like "Module not found" or "Flask not installed", run:
```powershell
pip install flask flask-cors torch torchvision pillow
```

### Option B: Quick Start from app/components

```bash
cd app/components
python plant_disease_cnn.py --serve
```

---

## 2. Verify Flask is Responding

### From Your Computer

Open a terminal and test the health endpoint:

```bash
# On Windows PowerShell
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET

# On Linux/Mac/WSL bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "model": "PlantGuardCNN",
  "classes": 14,
  "device": "CPU",
  "cache_hit_rate": "0%"
}
```

---

## 3. Fix API URL Based on Your Setup

### For **Android Emulator**

The Android emulator cannot reach `localhost` on the host machine.  
**Use: `http://10.0.2.2:5000`**

This is the special IP that the Android emulator uses to reach the host machine's localhost.

**Current code (in Scan.tsx):**
```typescript
const API_BASE =
  Platform.select({
    android: "http://10.0.2.2:5000",    // ✓ Correct
    ios: "http://localhost:5000",
    default: "http://localhost:5000",
  }) ?? "http://localhost:5000";
```

**Test from emulator:**
```bash
# In Android emulator terminal (adb shell)
curl http://10.0.2.2:5000/health
```

---

### For **iOS Simulator**

iOS simulator can reach `localhost` if Flask runs on your machine.

**Current code:** ✓ Already correct

```typescript
ios: "http://localhost:5000",
```

**Test from iOS simulator:**
```bash
# In terminal on your machine
curl http://localhost:5000/health
```

---

### For **Physical Android Device**

Physical devices on the same Wi-Fi network need your machine's **local IP address**.

**Step 1: Find your machine's local IP**

```powershell
# Windows PowerShell
ipconfig | Select-String "IPv4"
```

Look for an IP like `192.168.1.10` or `192.168.100.102`

**Step 2: Update Scan.tsx**

```typescript
// Example: Replace android line with your actual IP
const API_BASE =
  Platform.select({
    android: "http://192.168.1.10:5000",  // ← Update this IP
    ios: "http://localhost:5000",
    default: "http://localhost:5000",
  }) ?? "http://localhost:5000";
```

**Step 3: Make sure Flask listens on all interfaces**

Flask must run with `host="0.0.0.0"` (already configured in `plant_disease_cnn.py`):

```python
app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
```

**Step 4: Test from device**

```bash
# On Android device (adb shell or terminal app)
curl http://192.168.1.10:5000/health
```

---

### For **Physical iOS Device**

Same as Android physical device:

**Step 1: Find local IP** (as above)

**Step 2: Update Scan.tsx**

```typescript
const API_BASE =
  Platform.select({
    android: "http://10.0.2.2:5000",
    ios: "http://192.168.1.10:5000",     // ← Update this IP
    default: "http://localhost:5000",
  }) ?? "http://localhost:5000";
```

---

## 4. Network / Firewall Troubleshooting

### Windows Firewall

If requests are blocked by Windows Firewall:

**Option A: Allow Flask in Firewall (Recommended)**

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Click "Allow another app..."
5. Find `python.exe` in your `.venv` folder
6. Select it and click "Add"
7. Make sure it's allowed for "Private networks"

**Option B: Temporarily Disable Firewall (Testing Only)**

```powershell
# Disable for testing (NOT recommended for production)
Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled $false

# Re-enable
Set-NetFirewallProfile -Profile Domain, Public, Private -Enabled $true
```

### Router / Network Issues

- Make sure your device and machine are on the **same Wi-Fi network**
- If on 5GHz: Try 2.4GHz (some devices have issues)
- Check if your router has a "Guest network" restriction

---

## 5. Debug Console Logs

### Add Logging to Scan.tsx

Add these debug logs to understand what's happening:

```typescript
// In the callAPI function, add logging:
const callAPI = async (base64: string): Promise<Omit<ScanRecord, "timestamp">> => {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 20000);

  console.log("[API] Starting request to:", API_BASE);
  console.log("[API] Timeout: 20s");
  console.log("[API] Image size:", base64.length, "bytes");

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);

    console.log("[API] Response status:", res.status);
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error ?? `Server error ${res.status}`);
    }

    const data = await res.json();
    console.log("[API] Success:", data);
    
    if (!data.label || data.confidence === undefined) {
      throw new Error("Invalid response from CNN server.");
    }
    return data as Omit<ScanRecord, "timestamp">;
  } catch (e: any) {
    const msg = e?.message || String(e);
    console.log("[API] Error:", msg);
    
    // Debug specific error types
    if (msg.includes("aborted")) {
      console.log("[API] Request was aborted - likely timeout or network issue");
    }
    if (msg.includes("Network")) {
      console.log("[API] Network error - Flask server unreachable?");
    }
    
    throw e;
  }
};
```

### View Logs in Expo

```bash
# Run app with logs visible
npx expo start

# In Expo terminal, press:
# - 'j' for iOS simulator logs
# - 'a' for Android emulator logs
# - 'w' for web logs

# Or use Expo Go app → tap device → view logs
```

---

## 6. Common Error Messages & Solutions

### Error: "Cannot GET /predict"

**Cause:** Flask route not found  
**Solution:** Make sure Flask server is running with `python run_api_server.py`

### Error: "Connection refused" or "ECONNREFUSED"

**Cause:** Flask not running or wrong IP  
**Solution:**  
1. Check Flask is running (`ps aux | grep python`)
2. Verify API_BASE has correct IP
3. Test from device: `curl http://<IP>:5000/health`

### Error: "Request timeout" or "Aborted"

**Cause:** Network unreachable or request taking too long  
**Solution:**  
1. Check device can reach Flask: `ping <IP>` (or `ping -c 3 <IP>` on Linux)
2. Verify Flask is not blocking: check Windows Firewall
3. Try disabling timeout temporarily in code (for testing):
   ```typescript
   const tid = setTimeout(() => ctrl.abort(), 60000); // 60s instead of 20s
   ```

### Error: "Network request failed" or "TypeError: Network request failed"

**Cause:** Network connectivity issue  
**Solution:**  
1. Check Wi-Fi connection
2. Try pinging the machine from device
3. Check router firewall settings

### Error: "CORS policy" or "No 'Access-Control-Allow-Origin' header"

**Cause:** Flask CORS not configured  
**Solution:** Flask already has CORS enabled (`CORS(app)`), but if you modified the code:
   ```python
   from flask_cors import CORS
   app = Flask(__name__)
   CORS(app)  # ← Must be called AFTER Flask() and BEFORE routes
   ```

---

## 7. Full Working Example

Here's a complete, tested example for debugging:

### Scan.tsx - Enhanced with Logging

```typescript
// Add this to the top of your file
const DEBUG = true;  // Set to false in production

const log = (tag: string, message: any) => {
  if (DEBUG) {
    console.log(`[PathoNet/${tag}] ${message}`);
  }
};

// In the callAPI function:
const callAPI = async (
  base64: string
): Promise<Omit<ScanRecord, "timestamp">> => {
  const ctrl = new AbortController();
  const tid = setTimeout(() => {
    log("TIMEOUT", "20s timeout reached, aborting request");
    ctrl.abort();
  }, 20000);

  log("API", `Sending request to ${API_BASE}/predict`);
  log("API", `Image size: ${(base64.length / 1024 / 1024).toFixed(2)} MB`);

  try {
    const startTime = Date.now();
    
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64 }),
      signal: ctrl.signal,
    });
    
    const elapsed = Date.now() - startTime;
    clearTimeout(tid);

    log("API", `Response received in ${elapsed}ms (status: ${res.status})`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errorMsg = (err as any).error ?? `Server error ${res.status}`;
      log("API_ERROR", errorMsg);
      throw new Error(errorMsg);
    }

    const data = await res.json();
    log("API_SUCCESS", `Got prediction: ${data.label} (${(data.confidence * 100).toFixed(1)}%)`);
    
    if (!data.label || data.confidence === undefined) {
      throw new Error("Invalid response from CNN server.");
    }
    
    return data as Omit<ScanRecord, "timestamp">;
  } catch (err: any) {
    clearTimeout(tid);
    
    const msg = err?.message || String(err);
    log("API_CATCH", msg);

    // Categorize the error for better debugging
    if (msg.includes("aborted")) {
      log("DEBUG", "Request aborted - likely timeout or user abort");
      throw new Error("Request timeout. Flask server may be overloaded or unreachable.");
    }
    if (msg.includes("Network") || msg.includes("Failed to fetch")) {
      log("DEBUG", "Network error - Flask not reachable at " + API_BASE);
      throw new Error(`Cannot reach Flask server at ${API_BASE}`);
    }
    
    throw err;
  }
};
```

### Test Script - Quick Connectivity Check

Create a file `test-api.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000"
echo "Testing Flask API at $API_URL"

# Test health endpoint
echo "\n1. Testing /health endpoint..."
curl -i -X GET "$API_URL/health"

# Test with empty image (will fail prediction but tests connectivity)
echo "\n2. Testing /predict endpoint..."
curl -i -X POST "$API_URL/predict" \
  -H "Content-Type: application/json" \
  -d '{"image":"dummy"}'

echo "\n3. Testing CORS headers..."
curl -i -X OPTIONS "$API_URL/predict" \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST"
```

Run it:
```bash
bash test-api.sh
```

---

## 8. Step-by-Step Fix Checklist

1. **Start Flask:**
   ```powershell
   python run_api_server.py
   ```
   ✓ Confirm: "PlantGuard API running on http://0.0.0.0:5000"

2. **Test from your machine:**
   ```powershell
   curl http://localhost:5000/health
   ```
   ✓ Confirm: You see JSON response

3. **Find your local IP:**
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   ✓ Note down: e.g., `192.168.1.10`

4. **Update Scan.tsx for your device:**
   - Android Emulator: Already correct (`10.0.2.2:5000`)
   - Physical Device: Use your IP (e.g., `192.168.1.10:5000`)

5. **Enable debug logging:**
   - Add `const DEBUG = true` in Scan.tsx
   - Watch Expo logs while scanning

6. **Test scan:**
   - Take a photo or select from gallery
   - Tap "Tap to scan"
   - Check console logs for errors

7. **If still failing:**
   - Check Windows Firewall (allow python.exe on port 5000)
   - Check Flask server console for errors
   - Verify device on same Wi-Fi network
   - Try temporarily increasing timeout to 60s

---

## 9. Additional Resources

- [Expo Network Documentation](https://docs.expo.dev/build/troubleshooting/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Android Emulator Networking](https://developer.android.com/studio/run/emulator-networking)
- [React Native Fetch API](https://reactnative.dev/docs/network)

---

## Need Help?

Check these first:

1. **Is Flask running?** → Check terminal shows "PlantGuard API running"
2. **Can you curl from machine?** → `curl http://localhost:5000/health` should work
3. **Is device on same network?** → Both machine and device should see each other with ping
4. **Firewall blocking?** → Check Windows Defender Firewall settings
5. **Wrong IP in code?** → Verify `API_BASE` matches your machine's local IP

Good luck! 🌱
