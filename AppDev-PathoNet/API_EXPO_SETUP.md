# 🚀 Expo + Python API Setup Guide

This guide explains how to run both your Expo app and Python API server automatically.

## 📦 Project Structure

```
ApplicationDevelopment/
├── .venv/                          # Python virtual environment (parent level)
│   ├── Scripts/                    # (Windows)
│   └── bin/                        # (macOS/Linux)
├── run_api_server.py               # API entry point (parent level)
│
└── AppDev-PathoNet/                # Expo app
    ├── package.json                # Node.js configuration
    ├── scripts/
    │   ├── run-api.js              # Cross-platform API launcher
    │   └── kill-processes.js       # Process cleanup script
    ├── app/
    │   └── components/
    │       └── plant_disease_cnn.py
    └── run_api_server.py           # Duplicate entry point (optional)
```

## ⚙️ Setup Instructions

### 1. **Install Dependencies**

From `AppDev-PathoNet/` directory:

```bash
npm install
# concurrently is already in package.json
```

### 2. **Set Up Python Virtual Environment** (Parent directory)

```bash
# From ApplicationDevelopment/ (parent directory)
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate

# macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r AppDev-PathoNet/requirements.txt
```

### 3. **Verify Setup**

Test that Python runs correctly:

```bash
# From parent directory
.venv/Scripts/python.exe run_api_server.py  # Windows
# or
.venv/bin/python run_api_server.py  # macOS/Linux
```

You should see:

```
======================================================================
  🌱 PathoNet Disease Detection API Server
======================================================================
✓ Starting Flask server on http://localhost:5000
✓ Health check:  GET  http://localhost:5000/health
✓ Predictions:   POST http://localhost:5000/predict
✓ Classes:       GET  http://localhost:5000/classes
```

## 🎯 Running the Services

### Option 1: **Run Both Simultaneously** (Recommended)

From the `AppDev-PathoNet/` directory:

```bash
npm start
# or
npm run start:dev
```

This will:

- ✅ Start the Python API server on `http://localhost:5000`
- ✅ Start the Expo dev server (you'll see the QR code)
- ✅ Both run in the same terminal with color-coded output
- ✅ Press `Ctrl+C` to stop both services

### Option 2: **Run Services Separately**

**Terminal 1 - API Server:**

```bash
npm run start-api
```

**Terminal 2 - Expo:**

```bash
npm run start-expo
```

### Option 3: **Run Expo-Only** (API already running)

```bash
expo start
```

## 🔌 API Endpoints

After starting the API, access it at:

- **Health Check:** `GET http://localhost:5000/health`
- **Predict:** `POST http://localhost:5000/predict`
- **Classes:** `GET http://localhost:5000/classes`

## 🛑 Stopping Services

### Method 1: Press `Ctrl+C`

In the terminal where you ran `npm start`, press `Ctrl+C` twice to stop all services.

### Method 2: Use Stop Script

```bash
npm run stop
# or
npm run kill-processes
```

## 🐍 Python Requirements

Ensure your `requirements.txt` includes:

```txt
Flask==2.3.0
torch==2.0.0
torchvision==0.15.0
Pillow==10.0.0
numpy==1.24.0
opencv-python==4.8.0.0
```

Install/update with:

```bash
pip install -r AppDev-PathoNet/requirements.txt
```

## ⚠️ Troubleshooting

### "Python not found" Error

**Solution:** Activate your virtual environment first:

```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

# Then run
npm start
```

### "Port 5000 is already in use"

The API is already running. Either:

- Kill the existing process: `npm run kill-processes`
- Use a different port: `API_PORT=5001 npm start`

### "Module not found" Error in Python

Make sure dependencies are installed:

```bash
pip install -r requirements.txt
```

### "expo start" fails with socket error

Try these solutions:

```bash
# Clear Expo cache
npm run reset-project

# Or clear npm cache
npm cache clean --force

# Then try again
npm start
```

## 🔧 Environment Variables

Create `.env` in `AppDev-PathoNet/` for custom settings:

```env
# API Configuration
API_PORT=5000
API_HOST=localhost
NODE_ENV=development

# Python Configuration
PYTHONUNBUFFERED=1
```

Then in Node scripts, access with: `process.env.API_PORT`

## 📝 Script Details

### `scripts/run-api.js`

- ✅ Detects Python (venv first, then system)
- ✅ Handles both Windows and Unix systems
- ✅ Shows helpful error messages
- ✅ Graceful shutdown on `Ctrl+C`
- ✅ Inherits Python output for debugging

### `scripts/kill-processes.js`

- ✅ Kills processes by port
- ✅ Handles Windows and Unix
- ✅ Safe cleanup

## 🚀 Next Steps

1. Run `npm start` from the `AppDev-PathoNet/` folder
2. Scan the QR code with Expo Go app (or choose an emulator)
3. Your Expo app now connects to `http://localhost:5000` for API calls

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Concurrently Package](https://www.npmjs.com/package/concurrently)
- [Flask Documentation](https://flask.palletsprojects.com)
