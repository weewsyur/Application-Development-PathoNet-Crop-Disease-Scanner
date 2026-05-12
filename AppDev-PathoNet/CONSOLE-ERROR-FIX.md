# Console Error Fix Summary

## Error Analysis

From the console logs, the main error is:
```
:5000/predict/v2:1  Failed to load resource: net::ERR_CONNECTION_REFUSED
[Scan] API Call Failed: Object
[Scan] Scan failed: Object
```

**Root Cause:** The Flask API server is not running on port 5000.

## What Was Fixed

### 1. .env File Configuration
**Changed from:** `EXPO_PUBLIC_API_URL=http://192.168.X.X:5000`
**Changed to:** `EXPO_PUBLIC_API_URL=http://localhost:5000`

This is correct for web/local development. For physical devices, use your PC's local IP.

### 2. Created start-api-server.bat
A Windows batch script that:
- Searches for Python in common installation locations
- Bypasses Windows Store Python alias
- Starts the API server automatically

### 3. Fixed Windows Store Python Alias Issue
The script now checks actual Python installations first, avoiding the Windows Store alias that causes "Python was not found" errors.

## How to Run the System

### Step 1: Start the API Server
Run the batch script:
```bash
.\start-api-server.bat
```

This will:
- Find Python automatically
- Start the Flask server on http://localhost:5000
- Show server logs in the console

### Step 2: Verify Server is Running
Open browser and visit:
```
http://localhost:5000/health/v2
```

You should see a JSON response with health status.

### Step 3: Restart Expo (if needed)
```bash
npx expo start --clear
```

### Step 4: Test the Scan Feature
1. Open the Expo app in browser
2. Navigate to Scan tab
3. Take or select a photo
4. Tap "Tap to analyse"
5. Should connect to API and show results

## If Python Still Not Found

### Disable Windows Store Python Alias
1. Open Windows Settings
2. Go to Apps > Advanced app settings > App execution aliases
3. Turn off "App Installer (python.exe)"
4. Restart terminal
5. Run `.\start-api-server.bat` again

### Or Add Python to PATH
1. Find Python installation (usually: `C:\Users\YourUsername\AppData\Local\Programs\Python\Python3xx\`)
2. Press `Win + R`, type `sysdm.cpl`
3. Advanced → Environment Variables
4. Edit "Path" under System variables
5. Add Python directory and Scripts directory
6. Restart terminal

## Other Console Warnings (Not Critical)

These warnings can be ignored for now:
- `shadow*` style props deprecated
- `props.pointerEvents` deprecated
- `ImagePicker.MediaTypeOptions` deprecated
- `useNativeDriver` not supported on web (expected for web platform)

These are deprecation warnings and don't affect functionality.

## Expected Behavior

When the API server is running:
1. Console will show: `[Scan] API Configuration: { envApiUrl: 'http://localhost:5000', ... }`
2. Console will show: `[Scan] Final API_BASE: http://localhost:5000`
3. When scanning: `[Scan] Starting scan with API: http://localhost:5000`
4. API request will succeed: `[Scan] API Response Status: 200 OK`
5. Modal will open with scan results

## Troubleshooting

### Server won't start
- Check if Python is installed
- Disable Windows Store Python alias
- Run `.\start-api-server.bat` again

### Connection still refused
- Verify server is running (check console)
- Check if port 5000 is already in use
- Try different port: set PORT=8080 in environment

### Dependencies not installed
- The script will show error if packages missing
- Install: `pip install -r requirements.txt` (after fixing Python PATH)
