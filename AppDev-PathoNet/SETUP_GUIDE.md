# Expo + Flask Setup Guide

Complete guide for setting up and running the PathoNet app with the Flask backend.

---

## Quick Start (5 minutes)

### Terminal 1: Start Flask Server

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start API server
python run_api_server.py
```

Expected output:
```
PlantGuard API running on http://0.0.0.0:5000
Device: CPU
Workers: 4 (concurrent request handling)
```

### Terminal 2: Start Expo Dev Server

```powershell
cd AppDev-PathoNet
npm start
# or
npx expo start --clear
```

Expected output:
```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █ ██▀▀█▄▄██ ▄▄▄▄▄ █
█ █   █ █  ▀█ ▀█ ▄█ █   █ █
█ █▄▄▄█ █▀  █▄ ▀▄██ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄█ ▀▄█ ▀ █▄▄▄▄▄▄▄█
...

› Scan the QR code above to open in Expo Go.
› Metro: exp://192.168.100.102:8081
› Web: http://localhost:8081
```

---

## Deployment Scenarios

### Scenario A: Android Emulator ✓ (Easiest)

**No changes needed!**

The Android emulator can reach the host machine via `10.0.2.2`.  
Code already handles this:

```typescript
// From Scan.tsx
const API_BASE = Platform.select({
  android: "http://10.0.2.2:5000",    // ← Emulator → host machine
  ios: "http://localhost:5000",
  default: "http://localhost:5000",
}) ?? "http://localhost:5000";
```

**Steps:**
1. Start Flask: `python run_api_server.py`
2. Start Expo: `npx expo start`
3. Press `a` in Expo to open Android Emulator
4. Tap scan button → should work! ✓

**Troubleshooting:**
- If it fails, check Flask is running on Terminal 1
- Check firewall allows port 5000

---

### Scenario B: iOS Simulator

**No changes needed!**

iOS simulator on the same machine can reach `localhost`.

**Steps:**
1. Start Flask: `python run_api_server.py`
2. Start Expo: `npx expo start`
3. Press `i` in Expo to open iOS Simulator
4. Tap scan button → should work! ✓

**Troubleshooting:**
- If it fails, make sure Flask is on port 5000
- Try `curl http://localhost:5000/health` from terminal

---

### Scenario C: Physical Android Device (Same Wi-Fi)

**⚠️ Requires Configuration**

You need to find your machine's local IP and update the code.

**Step 1: Find your machine's local IP**

```powershell
# Windows PowerShell
ipconfig | Select-String "IPv4"
```

Look for an IP like:
- `192.168.1.10`
- `192.168.100.102`
- `10.0.0.5`

**Step 2: Update Scan.tsx**

Open [Scan.tsx](./app/(tabs)/Scan.tsx) and find the `API_BASE` definition:

```typescript
const API_BASE = Platform.select({
  android: "http://YOUR_MACHINE_IP:5000",  // ← Change this line
  ios: "http://localhost:5000",
  default: "http://localhost:5000",
}) ?? "http://localhost:5000";
```

Replace with your actual IP:

```typescript
const API_BASE = Platform.select({
  android: "http://192.168.1.10:5000",  // ← Example: your actual IP
  ios: "http://localhost:5000",
  default: "http://localhost:5000",
}) ?? "http://localhost:5000";
```

**Step 3: Make sure Flask listens on all interfaces**

Flask already does this (in `plant_disease_cnn.py`):

```python
app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
```

✓ No changes needed.

**Step 4: Start servers**

```powershell
# Terminal 1
python run_api_server.py

# Terminal 2
npx expo start
```

**Step 5: Connect device**

1. Open Expo Go app on your phone
2. Scan the QR code from Terminal 2
3. App loads → tap Scan → should work! ✓

**Troubleshooting:**
- "Server Unreachable" → Check device is on same Wi-Fi
- "Timeout" → Check Flask running, try pinging IP from device
- "Network error" → Check Windows Firewall allows port 5000

---

### Scenario D: Physical iOS Device (Same Wi-Fi)

**⚠️ Requires Configuration**

Same as Android physical device above, but update the `ios` line instead:

**In Scan.tsx:**

```typescript
const API_BASE = Platform.select({
  android: "http://10.0.2.2:5000",
  ios: "http://192.168.1.10:5000",      // ← Change this line
  default: "http://localhost:5000",
}) ?? "http://localhost:5000";
```

Then follow the same steps as Scenario C.

---

### Scenario E: Physical Device on Different Network (Remote)

**Advanced Setup Required**

You would need to:
1. Set up a reverse proxy or tunnel (ngrok, AWS EC2, etc.)
2. Point to the public URL instead of localhost

This is beyond the scope of basic setup. See **Additional Resources** section.

---

## Configuration File (Optional)

Instead of hardcoding the IP in code, you can create a config file:

### Create: `config.env.json`

```json
{
  "api": {
    "baseUrl": {
      "android": "http://192.168.1.10:5000",
      "ios": "http://192.168.1.10:5000",
      "web": "http://localhost:5000",
      "default": "http://localhost:5000"
    }
  },
  "debug": {
    "enableNetworkLogs": true,
    "apiTimeout": 20000
  }
}
```

### Use in Scan.tsx:

```typescript
import config from "../config.env.json";

const API_BASE = Platform.select({
  android: config.api.baseUrl.android,
  ios: config.api.baseUrl.ios,
  web: config.api.baseUrl.web,
  default: config.api.baseUrl.default,
}) ?? config.api.baseUrl.default;

const DEBUG = config.debug.enableNetworkLogs;
```

This way you can change the IP without touching code.

---

## Environment Variables (Best Practice for Production)

### Create: `.env` file (in root)

```
REACT_NATIVE_BACKEND_URL=http://192.168.1.10:5000
REACT_NATIVE_DEBUG_MODE=true
```

### Create: `config/env.ts`

```typescript
export const API_BASE = process.env.REACT_NATIVE_BACKEND_URL || "http://localhost:5000";
export const DEBUG = process.env.REACT_NATIVE_DEBUG_MODE === "true";
```

### Use in Scan.tsx:

```typescript
import { API_BASE, DEBUG } from "@/config/env";
```

---

## Network Debugging Commands

### From Your Machine

```powershell
# Test Flask is running
Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET

# Show your IP
ipconfig | Select-String "IPv4"

# Check if Flask is listening on all interfaces
netstat -ano | Select-String "5000"
```

### From Android Emulator

```bash
# Connect to emulator
adb shell

# Test from emulator
curl http://10.0.2.2:5000/health
ping 10.0.2.2

# Check network
netstat -a | grep 5000
```

### From Physical Device

```bash
# On device terminal (if available)
ping 192.168.1.10
curl http://192.168.1.10:5000/health

# Or from your machine
adb shell ping 192.168.1.10
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Server Unreachable" | Flask not running | Run `python run_api_server.py` |
| "Timeout" | Network too slow | Increase timeout in code or retry |
| "Connection Refused" | Wrong IP or port | Verify IP and Flask running on port 5000 |
| "Firewall Blocked" | Windows Firewall | Add python.exe to firewall exceptions |
| "CORS Error" | Flask CORS not enabled | CORS already enabled, but verify `CORS(app)` in code |
| "Invalid JSON" | Image too large or corrupted | Reduce image quality or check image |
| "Model not found" | Weights file missing | Expected - model runs randomly for demo |

---

## Performance Tips

### For Slower Networks

Increase timeout and add retry logic:

```typescript
// In callAPI function
const TIMEOUT_MS = 30000;  // 30s instead of 20s
const MAX_RETRIES = 2;     // Retry twice
```

### For Large Images

Reduce quality when capturing:

```typescript
const photo = await ImagePicker.launchCameraAsync({
  quality: 0.6,      // Reduce from 0.8
  base64: true,
});
```

### For Multiple Concurrent Scans

Flask already handles this with 4 workers:

```python
AsyncModelServer(weights_path=weights_path, max_workers=4)
```

But on slow devices, you might want to disable concurrent requests in the UI.

---

## Monitoring & Debugging

### Check Flask Logs

The Flask server outputs prediction results:

```
📡 Received prediction request...
✓ Model inference: 234ms
✓ Cached hit: 0%
```

### Check Expo Logs

In Expo terminal, press:
- `j` for iOS simulator logs
- `a` for Android emulator logs  
- `w` for web logs
- `?` for all commands

Or use Expo app → Device → View Logs

### Enable Debug Logging

The enhanced error handling now includes console logs:

```
[API] Request #1 starting...
[API] Target: http://192.168.1.10:5000/predict
[API] Image size: 245.5KB
[API] Response received in 1234ms (status: 200)
[API] ✓ Success: Healthy (confidence: 85.2%)
```

---

## Deployment to Production

### For Expo Go (Current)

- Works on emulator and same Wi-Fi
- Limited to development builds
- Good for testing and demos

### For App Store / Play Store

1. **Build APK (Android):**
   ```bash
   eas build --platform android
   ```

2. **Update API URL to production:**
   ```typescript
   const API_BASE = "https://your-api.com";  // Update to production URL
   ```

3. **Deploy Flask to production server:**
   - Use gunicorn + nginx
   - Consider AWS EC2, Google Cloud, DigitalOcean
   - Add rate limiting and authentication

See **Additional Resources** for deployment guides.

---

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Flask Deployment](https://flask.palletsprojects.com/deployment/)
- [Android Emulator Networking](https://developer.android.com/studio/run/emulator-networking)
- [React Native Networking](https://reactnative.dev/docs/network)
- [ngrok for Remote Access](https://ngrok.com/)
- [EAS Build for App Deployment](https://docs.expo.dev/build/introduction/)

---

## Getting Help

If you're stuck:

1. **Check the debugging guide:** [API_DEBUGGING_GUIDE.md](./API_DEBUGGING_GUIDE.md)
2. **Check Flask is running:** `curl http://localhost:5000/health`
3. **Check Expo logs:** Press `a` or `j` in Expo terminal
4. **Check network:** Ping your machine from device
5. **Check firewall:** Windows Defender Firewall settings

Good luck! 🌱
