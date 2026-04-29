# PathoNet Scanner - Complete Fix Guide

## ⚠️ Current Issue: Flask Server NOT Running

I've diagnosed the problem: **Flask server on port 5000 is not running**

This is why the Expo app shows:
- "Scan Failed - Aborted"
- "Server Offline"

---

## ✅ Quick Fix (5 Steps)

### Step 1: Open Terminal & Navigate to Project

```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment
```

### Step 2: Activate Python Virtual Environment

```powershell
.\.venv\Scripts\Activate.ps1
```

**Expected output:**
```
(.venv) PS C:\Users\2060\Desktop\ApplicationDevelopment>
```

If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

### Step 3: Start Flask Server

```powershell
python run_api_server.py
```

**Expected output:**
```
======================================================================
  🌱 PathoNet Disease Detection API Server
======================================================================

✓ Port 5000 is available
✓ Starting Flask server...

Available Endpoints:
  GET  /health    →  Check server status & model info
  POST /predict   →  Predict disease (send base64 image)
  GET  /classes   →  Get disease class names
  GET  /stats     →  Get server statistics

🎯 To test from your machine:
  curl http://localhost:5000/health
  curl http://localhost:5000/classes

📱 For Expo app:
  Android Emulator: http://10.0.2.2:5000
  iOS Simulator: http://localhost:5000
  Physical Device: http://<your-machine-ip>:5000

⏹️  Press Ctrl+C to stop the server

======================================================================

 *  History restored 
PlantGuard API running on http://0.0.0.0:5000
Device: CPU
Workers: 4 (concurrent request handling)
```

✅ **Flask is now running!** Leave this terminal open.

### Step 4: Verify Flask is Working (New Terminal)

Open a **new terminal** and run:

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET | ConvertTo-Json
```

**Expected output:**
```json
{
  "status": "ok",
  "model": "PlantGuardCNN",
  "classes": 14,
  "device": "CPU",
  "cache_hit_rate": "0%"
}
```

✅ **Flask is responding!**

### Step 5: Start Expo App (New Terminal)

Open a **third terminal** and run:

```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet
npx expo start --clear
```

**Expected output:**
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ██▀▀█▄▄██ ▄▄▄▄▄ █
█ █   █ █  ▀█ ▀█ ▄█ █   █ █
█ █▄▄▄█ █▀  █▄ ▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄█ ▀▄█ ▀ █▄▄▄▄▄▄▄█

› Scan the QR code above to open in Expo Go.
› Metro: exp://192.168.100.102:8081
› Web: http://localhost:8081

› Using Expo Go (Press s to switch to development build)
› Press ? │ show all commands
```

✅ **Expo is running!**

---

## 🧪 Test the Scanner

### On Android Emulator

1. In Expo terminal, press `a` to open Android Emulator
2. App loads → Tap "Scan" tab
3. Take a photo or select from gallery
4. Tap "Tap to scan" button
5. Result should appear! ✅

### On iOS Simulator

1. In Expo terminal, press `i` to open iOS Simulator
2. App loads → Tap "Scan" tab
3. Take a photo or select from gallery
4. Tap "Tap to scan" button
5. Result should appear! ✅

### On Physical Device

⚠️ **Additional step needed!**

1. Find your machine's IP address:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```
   Look for: `192.168.x.x` or similar

2. Update [Scan.tsx](./app/(tabs)/Scan.tsx) with your IP:
   
   Find line 47:
   ```typescript
   const API_BASE = Platform.select({
     android: "http://10.0.2.2:5000",     // ← Keep this for emulator
     ios: "http://localhost:5000",
     default: "http://localhost:5000",
   })
   ```

   Change to (replace `192.168.1.10` with YOUR IP):
   ```typescript
   const API_BASE = Platform.select({
     android: "http://192.168.1.10:5000",  // ← Update this
     ios: "http://192.168.1.10:5000",      // ← And this
     default: "http://192.168.1.10:5000",
   })
   ```

3. Make sure device is on **same Wi-Fi** as your machine
4. Open Expo Go → Scan QR code from terminal
5. Tap "Tap to scan" → should work! ✅

---

## 🔍 Advanced Diagnostics

### Run Automated Tests

If the above doesn't work, run the diagnostic script:

```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment
python test_api.py
```

This will check:
- ✓ Port 5000 is listening
- ✓ Flask /health endpoint responds
- ✓ /classes endpoint works
- ✓ /stats endpoint works
- ✓ CORS headers are correct
- ✓ Network connectivity

**Example output:**
```
======================================================================
  🧪 PathoNet API Diagnostics
======================================================================

Target: http://localhost:5000

✓ Testing port connectivity...
✓ Port 5000 is listening ✓

✓ Testing http://localhost:5000/health...
✓ Health check passed ✓
   Status: ok
   Model: PlantGuardCNN
   Classes: 14
   Device: CPU

... [more tests]

======================================================================
  Summary: 6/6 tests passed
======================================================================

✅ All systems operational! Your Flask server is ready.
```

### Check Expo Logs

While testing, check Expo logs to see debug output:

```powershell
# In the Expo terminal, press one of these:
# a  → View Android logs
# j  → View iOS logs  
# w  → View web logs
# ?  → Show all commands
```

**You should see:**
```
[API] Request #1 starting...
[API] Target: http://10.0.2.2:5000/predict
[API] Image size: 245.5KB
[API] Response received in 1234ms (status: 200)
[API] ✓ Success: Healthy (confidence: 85.2%)
```

### Check Flask Server Logs

The Flask terminal shows prediction results:

```
📡 Received prediction request...
✓ Model inference: 234ms
✓ Cached: No
✓ Response ready (label: Healthy, confidence: 0.85)
```

---

## 🐛 Common Errors & Solutions

### Error: "Cannot reach Flask server"

**Cause:** Flask not running or wrong IP

**Solution:**
1. Verify Flask is running in Terminal 1: `python run_api_server.py`
2. Check it responds: `curl http://localhost:5000/health`
3. Verify correct IP in Scan.tsx

### Error: "Request timeout"

**Cause:** Flask taking too long or network latency

**Solution:**
1. Check Flask server isn't stuck
2. Try increasing timeout in Scan.tsx (line 133):
   ```typescript
   const TIMEOUT_MS = 30000;  // was 20000
   ```
3. Check device Wi-Fi signal strength

### Error: "Network request failed"

**Cause:** Device can't reach machine IP

**Solution:**
1. Ping test: `ping 192.168.1.10` (from device)
2. Verify same Wi-Fi network
3. Check Windows Firewall allows port 5000

### Error: "Connection refused"

**Cause:** Port 5000 blocked or wrong address

**Solution:**
1. Check port: `netstat -ano | findstr :5000`
2. Kill existing process: `taskkill /pid <PID> /f`
3. Restart Flask: `python run_api_server.py`

### Error: "Invalid JSON response"

**Cause:** Image too large or corrupted

**Solution:**
1. Reduce image quality in Scan.tsx (line 241):
   ```typescript
   quality: 0.6,  // was 0.8
   ```
2. Use a smaller image file

---

## 📋 Terminal Setup Checklist

You need **3 terminals open simultaneously**:

### Terminal 1: Flask Server ✓
```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment
.\.venv\Scripts\Activate.ps1
python run_api_server.py
```
**Status:** "PlantGuard API running on http://0.0.0.0:5000"

### Terminal 2: Testing (Optional) ✓
```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment
Invoke-WebRequest -Uri "http://localhost:5000/health"
```
**Status:** Should see JSON response

### Terminal 3: Expo Server ✓
```powershell
cd C:\Users\2060\Desktop\ApplicationDevelopment\AppDev-PathoNet
npx expo start --clear
```
**Status:** QR code displayed

---

## 🚀 What Happens When You Scan

1. **Expo App** captures photo as base64
2. **Scan.tsx** sends POST request to Flask `/predict`
3. **Flask** receives image, runs CNN model
4. **Flask** returns: label, confidence, top3 predictions
5. **Expo App** displays result card
6. **User** saves scan with notes
7. **AsyncStorage** stores scan locally

All with enhanced error handling and logging! ✅

---

## 🆘 Still Not Working?

Run the complete diagnostic:

```powershell
# 1. Check dependencies
pip list | findstr "flask torch"

# 2. Check port
netstat -ano | findstr :5000

# 3. Test Flask directly
python -c "from plant_disease_cnn import run_flask_server; print('✓ Import OK')"

# 4. Run diagnostic tool
python test_api.py

# 5. Check network
ping localhost
ping 192.168.1.10  # Your machine IP
```

If still stuck, check:
- Windows Firewall settings (add python.exe to exceptions)
- Python path: `python --version`
- Virtual env: `pip show flask`
- Port conflicts: `netstat -ano | findstr LISTENING`

---

## 📚 Complete Code Review

Your Scan.tsx now includes:

✅ **Automatic retry** on network errors (1 retry)
✅ **Error categorization** for better messages
✅ **Console logging** for debugging
✅ **Timeout handling** with AbortController
✅ **Performance tracking** (response time)
✅ **Image size tracking** (base64 bytes)
✅ **Retry logic** with exponential backoff
✅ **User-friendly alerts** with actionable suggestions
✅ **Modal for saving** scan with notes
✅ **AsyncStorage** for local persistence

---

## 🎯 Next Steps

1. ✅ Start Flask: `python run_api_server.py`
2. ✅ Verify Flask: `Invoke-WebRequest http://localhost:5000/health`
3. ✅ Start Expo: `npx expo start`
4. ✅ Test scanner: Take photo → Tap scan → See result
5. ✅ Check logs: `Press a` in Expo for debug output
6. ✅ Save results: Tap save → View in Analytics tab

**You're all set! 🌱**

---

## 📖 Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Fetch API](https://reactnative.dev/docs/network)
- [AsyncStorage Guide](https://react-native-async-storage.github.io/async-storage/)

Good luck! 🚀
