# ✅ PathoNet Scanner - Final Checklist

## 🎯 Goal: Fix "Scan Failed - Aborted" Error

---

## 📋 Pre-Flight Checklist

- [ ] Python 3.9+ installed (`python --version`)
- [ ] Virtual environment exists (`.venv` folder)
- [ ] All dependencies installed
- [ ] Flask is NOT already running on port 5000
- [ ] 3 terminals available
- [ ] Firewall allows port 5000

---

## 🚀 Quick Start (Follow These Steps)

### Terminal 1️⃣ — Start Flask Server

**Location:** `C:\Users\2060\Desktop\ApplicationDevelopment`

```powershell
# Step 1: Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Step 2: Start Flask (leaves terminal open)
python run_api_server.py
```

✅ **Expected output:**
```
PlantGuard API running on http://0.0.0.0:5000
Device: CPU
Workers: 4
```

⏹️ **Leave this terminal open** (don't close it!)

---

### Terminal 2️⃣ — Verify Flask Works (Optional but Recommended)

**Location:** Any folder (new terminal)

```powershell
# Test health endpoint
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET | Select-Object -ExpandProperty Content

# Expected: {"status": "ok", "model": "PlantGuardCNN", ...}
```

✅ **If you see JSON** → Flask is working!  
❌ **If you see error** → Flask not running, go back to Terminal 1

---

### Terminal 3️⃣ — Start Expo Dev Server

**Location:** `C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet`

```powershell
# Start Expo
npx expo start --clear
```

✅ **Expected output:**
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ QR Code here █
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

› Metro: exp://192.168.100.102:8081
› Press a for Android, i for iOS
```

✅ **Terminal is ready**

---

## 📱 Test the Scanner

### Option A: Android Emulator (Recommended - Works Every Time)

1. In **Terminal 3**, press `a`
2. Android Emulator opens
3. Wait for app to load (~30 seconds)
4. ✅ Green status bar at top
5. Tap "Scan" tab
6. Take photo: tap camera icon OR Tap "Gallery" icon
7. Tap "Tap to scan" button
8. ✅ **Result appears!** (Plant disease name + confidence)
9. Tap "Save" to save scan

---

### Option B: iOS Simulator

1. In **Terminal 3**, press `i`
2. iOS Simulator opens
3. Wait for app to load
4. ✅ Green status bar at top
5. Tap "Scan" tab
6. Take photo or pick from gallery
7. Tap "Tap to scan" button
8. ✅ **Result appears!**
9. Tap "Save" to save scan

---

### Option C: Physical Device (Requires Configuration)

#### Step 1: Find Your Machine's IP

```powershell
ipconfig | Select-String "IPv4"
```

Look for: `192.168.x.x` or `10.0.x.x`  
Example: `192.168.1.10`

#### Step 2: Edit Scan.tsx

Open: `AppDev-PathoNet\app\(tabs)\Scan.tsx`

Find lines 47-53:
```typescript
const API_BASE =
  Platform.select({
    android: "http://10.0.2.2:5000",
    ios: "http://localhost:5000",
    default: "http://localhost:5000",
  }) ?? "http://localhost:5000";
```

**Replace with your actual IP:**
```typescript
const API_BASE =
  Platform.select({
    android: "http://192.168.1.10:5000",    // ← YOUR IP
    ios: "http://192.168.1.10:5000",        // ← YOUR IP
    default: "http://192.168.1.10:5000",
  }) ?? "http://192.168.1.10:5000";
```

#### Step 3: Make Sure Both Devices Are On Same Wi-Fi

Check:
```powershell
# From your machine
ping 192.168.1.10  # Should respond

# From device terminal
ping 192.168.1.10  # Should respond
```

#### Step 4: Test on Device

1. In **Terminal 3**, press `s` (development build)
2. Scan QR code with Expo Go app on device
3. App loads
4. ✅ Green status bar (server online)
5. Take photo → Tap scan → Result appears! ✅

---

## 🧪 Troubleshooting

### ❌ "Server Offline" (Red Status Bar)

**Cause:** Flask not running or wrong IP

**Fix:**
```powershell
# Terminal 1: Check Flask is still running
# If not, start it: python run_api_server.py

# Terminal 2: Verify Flask responds
Invoke-WebRequest -Uri "http://localhost:5000/health"

# Should see: {"status": "ok", ...}
```

---

### ❌ "Scan Failed - Aborted"

**Cause:** One of:
1. Flask not running
2. Network unreachable
3. Timeout (Flask too slow)
4. Wrong IP for physical device

**Fix:**
```powershell
# 1. Check Flask running (Terminal 1)
# 2. Check response: Invoke-WebRequest http://localhost:5000/health
# 3. For physical device: Verify IP in Scan.tsx
# 4. Check device on same Wi-Fi
# 5. Check Windows Firewall allows port 5000
```

---

### ❌ "Request Timeout"

**Cause:** Flask taking >20 seconds or network latency

**Fix:**
1. Check Flask not overloaded
2. Try again (auto-retry in code)
3. Increase timeout in `Scan.tsx` line 133:
   ```typescript
   const TIMEOUT_MS = 30000;  // was 20000
   ```

---

### ❌ "Network Error"

**Cause:** Device can't reach machine IP

**Fix:**
```powershell
# From device
ping 192.168.1.10  # Should respond

# If not:
# 1. Check same Wi-Fi
# 2. Check Windows Firewall:
#    Settings → Firewall → Allow app through
#    → Add python.exe from .venv folder
# 3. Try connecting device to 2.4GHz Wi-Fi (not 5GHz)
```

---

### ❌ "Port 5000 already in use"

**Cause:** Flask or another process already using port

**Fix:**
```powershell
# Find process
netstat -ano | findstr :5000

# Kill it
taskkill /pid <PID> /f

# Try again
python run_api_server.py
```

---

## 🔍 Debug Checklist

If still not working:

- [ ] Flask running? `Invoke-WebRequest http://localhost:5000/health`
- [ ] Port 5000 listening? `netstat -ano | findstr :5000`
- [ ] Virtual env activated? (See `.venv` in terminal)
- [ ] Dependencies installed? `pip list | findstr flask`
- [ ] Firewall allows port 5000?
- [ ] Physical device on same Wi-Fi?
- [ ] Correct IP in Scan.tsx?
- [ ] Image file not corrupted?
- [ ] Enough disk space?
- [ ] Network connection stable?

---

## 📊 Status Indicators

### Green Status Bar ✅
- Flask is running and reachable
- Device can reach Flask server
- All systems go!

### Red Status Bar ❌
- Flask not running OR unreachable
- Network issue or wrong IP
- Fix: Start Flask or update IP

### Yellow/Orange Status Bar ⚠️
- Connection intermittent
- Check network stability
- May see timeout errors

---

## 📝 Expected Logs (Check These)

### In Expo Terminal (After Scan)

```
[API] Request #1 starting...
[API] Target: http://10.0.2.2:5000/predict
[API] Image size: 245.5KB
[API] Response received in 1234ms (status: 200)
[API] ✓ Success: Healthy (confidence: 85.2%)
```

### In Flask Terminal (After Scan)

```
📡 Received prediction request...
✓ Model inference: 234ms
✓ Cached: No
✓ Response ready
```

---

## ✅ Success Criteria

You'll know it's working when:

✅ Flask terminal shows: `PlantGuard API running on http://0.0.0.0:5000`
✅ Green status bar in Expo app
✅ Can take/pick photo
✅ "Tap to scan" button is clickable
✅ After tapping, result card appears in ~2-5 seconds
✅ Can see: Plant disease name, confidence %, top 3 predictions
✅ Can save with notes
✅ Scan appears in Analytics tab

---

## 🎓 What Happens Behind The Scenes

```
User taps scan
  ↓
Scan.tsx calls callAPI(base64_image)
  ↓
Fetch POST http://10.0.2.2:5000/predict with image
  ↓
Flask receives image
  ↓
CNN model analyzes image (~234ms)
  ↓
Flask returns {label, category, confidence, class_id, top3}
  ↓
Scan.tsx parses response
  ↓
Result card displayed
  ↓
User saves scan with notes
  ↓
AsyncStorage stores locally
  ↓
Analytics tab shows all scans
```

All handled automatically with error recovery! ✅

---

## 🆘 Still Stuck?

Run diagnostics:

```powershell
# 1. Verify dependencies
pip show flask flask-cors

# 2. Test Flask startup
python -c "from plant_disease_cnn import run_flask_server; print('✓ Import OK')"

# 3. Run diagnostic tool
python test_api.py

# 4. Check process on port 5000
netstat -ano | findstr :5000

# 5. Check if firewall allows port
# Windows: Defender → Allow app → Add python.exe
```

---

## 📞 Support

If issues persist:

1. **Check logs** → Expand error messages
2. **Run diagnostics** → `python test_api.py`
3. **Review docs:**
   - [COMPLETE_FIX_GUIDE.md](./COMPLETE_FIX_GUIDE.md)
   - [CODE_REFERENCE.md](./CODE_REFERENCE.md)
   - [API_DEBUGGING_GUIDE.md](./API_DEBUGGING_GUIDE.md)

---

## 🎉 You've Got This!

Everything is already implemented. Just:
1. Start Flask
2. Start Expo
3. Scan a photo
4. See results! ✅

Good luck! 🌱
