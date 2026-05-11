# 📋 Expo + Python API: Complete Setup Summary

## 🎯 What Was Set Up

Your project now has **automatic Python API + Expo startup** with:

- ✅ Cross-platform compatibility (Windows, Mac, Linux)
- ✅ Smart Python detection (uses venv if available)
- ✅ Synchronized startup with `concurrently`
- ✅ Clean shutdown handling
- ✅ Error messages & troubleshooting tips

---

## 📁 Files Added/Modified

### Created Files:

```
AppDev-PathoNet/
├── scripts/
│   ├── run-api.js              ← Launches Python API
│   ├── kill-processes.js       ← Stops all services
│   └── start-all.js            ← Alternative: Node-only launcher
├── .env.example                ← Environment template
├── API_EXPO_SETUP.md           ← Full setup guide
├── QUICK_START.md              ← Beginner guide
└── package.json                ← UPDATED with new scripts
```

### Documentation Added (Root):

```
ApplicationDevelopment/
├── SETUP_METHODS.md            ← 4 different setup approaches
└── USING_THE_API.md            ← How to call API from app
```

---

## 🚀 Quick Start (Copy & Paste)

### First Time Setup:

```bash
# 1. Navigate to project
cd AppDev-PathoNet

# 2. Install Node dependencies
npm install

# 3. From parent directory, create Python venv (one time only)
cd ..
python -m venv .venv

# 4. Activate venv
.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Mac/Linux

# 5. Install Python dependencies
pip install -r AppDev-PathoNet/requirements.txt

# 6. Go back to app folder
cd AppDev-PathoNet
```

### Start Everything:

```bash
npm start
# That's it! Both services run now.
```

---

## 🎮 Available npm Scripts

| Command                  | What It Does     | Runs                     |
| ------------------------ | ---------------- | ------------------------ |
| `npm start`              | Start everything | API + Expo (both)        |
| `npm run start-api`      | API only         | Python Flask server      |
| `npm run start-expo`     | Expo only        | React Native dev server  |
| `npm run start:dev`      | Same as start    | API + Expo               |
| `npm run kill-processes` | Stop everything  | Kills all services       |
| `npm run stop`           | Alias for kill   | Alias for kill-processes |

---

## 🔌 What Gets Running

When you run `npm start`:

```
✓ Python API Server
  ├─ Address: http://localhost:5000
  ├─ Health: http://localhost:5000/health
  ├─ Predict: POST http://localhost:5000/predict
  └─ Classes: GET http://localhost:5000/classes

✓ Expo Dev Server
  ├─ Scan QR code with Expo Go app
  ├─ Or choose: Android Emulator / iOS Simulator
  └─ Metro bundler running
```

---

## 📍 Project Structure

```
ApplicationDevelopment/
├── .venv/                      ← Python virtual environment
├── run_api_server.py           ← API entry point
└── AppDev-PathoNet/            ← Expo app folder
    ├── package.json
    ├── scripts/
    │   ├── run-api.js
    │   ├── kill-processes.js
    │   └── start-all.js
    ├── app/
    │   ├── (tabs)/
    │   │   ├── Scan.tsx
    │   │   ├── Home.tsx
    │   │   └── Analytics.tsx
    │   └── components/
    │       └── plant_disease_cnn.py
    └── requirements.txt
```

---

## 💡 Key Features

### 1. **Auto-Detect Python** (`scripts/run-api.js`)

```javascript
✓ Checks: .venv/Scripts/python.exe (Windows)
✓ Checks: .venv/bin/python (Mac/Linux)
✓ Falls back to system Python
✓ Shows helpful errors
```

### 2. **Cross-Platform**

```javascript
✓ Windows:   python.exe from venv
✓ Mac/Linux: python from venv
✓ Fallback:  system python3
✓ Shell execution: true (Windows friendly)
```

### 3. **Error Handling**

```javascript
✓ "Python not found" → Shows activation instructions
✓ "Port already in use" → Use kill-processes.js
✓ "Script not found" → Shows file location
✓ Graceful Ctrl+C handling
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```env
# API Configuration
API_PORT=5000
API_HOST=localhost

# For your Expo app to use
REACT_APP_API_URL=http://localhost:5000
```

### API Port Customization

```bash
# Use different port
API_PORT=8000 npm start
```

---

## 🐛 Common Issues & Fixes

### "Python not found"

```bash
# Activate virtual environment first
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Mac/Linux

# Then run
npm start
```

### "Port 5000 already in use"

```bash
# Option 1: Kill processes
npm run kill-processes

# Option 2: Use different port
API_PORT=5001 npm start

# Option 3: Find process using port (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### "expo start fails"

```bash
# Clear cache and reinstall
npm cache clean --force
npm install
npm start
```

### "Module not found" (Python)

```bash
# Reinstall Python dependencies
pip install -r requirements.txt
```

### "API returns 500 error"

- Check if all Python dependencies are installed
- Run API manually to see error: `python run_api_server.py`
- Check `/health` endpoint: `curl http://localhost:5000/health`

---

## 📱 Using API from Expo App

### Simple Example:

```typescript
// Send image to API
const response = await fetch("http://localhost:5000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: imageBase64 }),
});

const prediction = await response.json();
console.log("Prediction:", prediction.disease);
```

### For Android Emulator:

```typescript
// Use this IP instead of localhost
const url = "http://10.0.2.2:5000/predict";
```

See [USING_THE_API.md](./USING_THE_API.md) for complete examples.

---

## 🔄 Setup Methods (Choose One)

| Method                        | Command                             | Pros                     | Cons               |
| ----------------------------- | ----------------------------------- | ------------------------ | ------------------ |
| **1. Concurrently (Current)** | `npm start`                         | One command, sync output | Need node scripts  |
| **2. Direct Python**          | `cd .. && python run_api_server.py` | Simple                   | Not cross-platform |
| **3. Node Script**            | `node scripts/start-all.js`         | No dependencies          | Sequential startup |
| **4. Separate Terminals**     | 2 terminals running separately      | Maximum control          | Manual management  |

See [SETUP_METHODS.md](../SETUP_METHODS.md) for detailed comparison.

---

## 📊 Startup Sequence

```
npm start
  ↓
concurrently spawns:
  ├─ npm run start-api
  │   ↓
  │   node scripts/run-api.js
  │   ↓
  │   finds Python
  │   ↓
  │   python run_api_server.py (from parent)
  │   ↓
  │   Flask server listens on :5000
  │
  └─ npm run start-expo
      ↓
      expo start
      ↓
      Metro bundler starts
      ↓
      Shows QR code
```

---

## ✅ Verification Checklist

- [ ] Python venv created in parent directory
- [ ] Dependencies installed: `npm install` & `pip install -r requirements.txt`
- [ ] `.env` file created (or using defaults)
- [ ] Ran `npm start` successfully
- [ ] API responds to `curl http://localhost:5000/health`
- [ ] Expo shows QR code
- [ ] Connected Expo Go to see the app
- [ ] Tested API call from app

---

## 📚 Full Documentation

- **Beginners:** Read [QUICK_START.md](./QUICK_START.md)
- **Full Details:** Read [API_EXPO_SETUP.md](./API_EXPO_SETUP.md)
- **API Usage:** Read [USING_THE_API.md](../USING_THE_API.md)
- **Setup Methods:** Read [SETUP_METHODS.md](../SETUP_METHODS.md)
- **Troubleshooting:** See sections below

---

## 🎯 Next Steps

1. ✅ Run `npm start`
2. ✅ Scan QR code with Expo Go
3. ✅ Test API from app
4. ✅ Check [USING_THE_API.md](../USING_THE_API.md) for integration examples
5. ✅ Deploy your plant disease detector! 🌱

---

## 🆘 Need Help?

1. Check [QUICK_START.md](./QUICK_START.md) - Beginner guide
2. Check [API_EXPO_SETUP.md](./API_EXPO_SETUP.md) - Full troubleshooting
3. Check [USING_THE_API.md](../USING_THE_API.md) - API integration
4. Run `npm run kill-processes` and restart

---

## 📞 Support Commands

```bash
# Show all available scripts
npm run

# Check if Python is installed
python --version

# Check if Node is working
node --version

# Test API health
curl http://localhost:5000/health

# Clear all Node cache
npm cache clean --force

# Reinstall everything
rm -rf node_modules package-lock.json
npm install
```

---

**Happy coding! 🚀🌱**
