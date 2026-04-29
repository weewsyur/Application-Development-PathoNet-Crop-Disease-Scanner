# 📖 Complete Setup Reference Guide

## 🎯 What You Now Have

A **complete Expo + Python API integration** that starts with a single command.

---

## 📋 File Summary

### Created Files (10 total)

#### Node.js Scripts (3 files in `AppDev-PathoNet/scripts/`)

| File                | Purpose                      | Size       |
| ------------------- | ---------------------------- | ---------- |
| `run-api.js`        | Python detection & launching | ~350 lines |
| `kill-processes.js` | Process cleanup utility      | ~80 lines  |
| `start-all.js`      | Alternative Node.js starter  | ~200 lines |

#### Configuration (1 file in `AppDev-PathoNet/`)

| File           | Purpose              | Lines |
| -------------- | -------------------- | ----- |
| `.env.example` | Environment template | 10    |

#### Documentation (6 files)

| File                 | Location           | Purpose      | Audience        |
| -------------------- | ------------------ | ------------ | --------------- |
| `QUICK_START.md`     | `AppDev-PathoNet/` | 5-min setup  | Beginners       |
| `API_EXPO_SETUP.md`  | `AppDev-PathoNet/` | Full details | Developers      |
| `SETUP_COMPLETE.md`  | `AppDev-PathoNet/` | Quick ref    | Everyone        |
| `SETUP_METHODS.md`   | Root               | 4 approaches | Decision makers |
| `USING_THE_API.md`   | Root               | API examples | Developers      |
| `SETUP_CHECKLIST.md` | Root               | Verification | QA              |

### Modified Files (1 file)

| File           | Changes         | Location           |
| -------------- | --------------- | ------------------ |
| `package.json` | Updated scripts | `AppDev-PathoNet/` |

---

## 🚀 Quick Start Diagram

```
YOUR SETUP
===========

npm start
   ↓
concurrently spawns 2 processes:
   ├── npm run start-api
   │   └─→ node scripts/run-api.js
   │       ├─→ Detects Python (venv or system)
   │       ├─→ Runs: python run_api_server.py
   │       └─→ Listens on http://localhost:5000
   │
   └── npm run start-expo
       └─→ expo start
           └─→ Shows QR code
               └─→ Scan with Expo Go

RESULT: Both services running together in one terminal
```

---

## 🎮 All Available Commands

```bash
# Primary command (RECOMMENDED)
npm start

# Individual services
npm run start-api           # API only
npm run start-expo          # Expo only

# Aliases
npm run start:dev           # Same as npm start
npm run stop                # Stops everything
npm run kill-processes      # Same as stop

# Management
npm cache clean --force     # Clear npm cache if issues
npm install                 # Reinstall dependencies

# For developers
npm run reset-project       # Reset Expo project
npm run android             # Run on Android
npm run ios                 # Run on iOS
npm run web                 # Run on web
npm run lint                # Lint code
```

---

## 📱 API Endpoints

Once running at `http://localhost:5000`:

```
Health Check (Status)
  GET /health
  → { status: "ok" }

Get Disease Classes
  GET /classes
  → ["Powdery Mildew", "Rust", "Leaf Spot", ...]

Predict Disease from Image
  POST /predict
  Body: { image: "base64_string" }
  → {
      disease: "Powdery Mildew",
      confidence: 0.95,
      description: "..."
    }
```

---

## 💻 Example: Calling API from App

### Minimal Example:

```typescript
const response = await fetch("http://localhost:5000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: imageBase64 }),
});

const { disease, confidence } = await response.json();
console.log(`Detected: ${disease} (${(confidence * 100).toFixed(2)}%)`);
```

### For Android Emulator:

```typescript
// Replace localhost with this:
const API_URL = "http://10.0.2.2:5000";
```

### For Physical Device:

```typescript
// Find your computer IP and use it:
const API_URL = "http://192.168.1.100:5000"; // Example IP
```

See [USING_THE_API.md](./USING_THE_API.md) for full service class and examples.

---

## 🔍 How It Works (Deep Dive)

### 1. npm Scripts (package.json)

```json
{
  "scripts": {
    "start": "concurrently --kill-others \"npm:start-api\" \"npm:start-expo\"",
    "start-api": "node scripts/run-api.js",
    "start-expo": "expo start"
  }
}
```

**What happens:**

- `concurrently` spawns 2 processes in parallel
- `--kill-others` stops all when one exits
- Output from both shows in same terminal

### 2. Python Detection (scripts/run-api.js)

```javascript
// Priority order:
1. .venv/Scripts/python.exe (Windows venv)
2. .venv/bin/python (Unix venv)
3. system python
4. system python3
```

**Why this works:**

- Checks venv first (isolated environment)
- Falls back to system if no venv
- Shows helpful errors if not found

### 3. Process Management

**Starting:**

- Node spawns Python as child process
- Inherits environment variables
- Output streams to terminal

**Stopping:**

- Ctrl+C sends SIGINT to parent
- Parent relays SIGTERM to children
- All processes terminate cleanly

### 4. Port Usage

```
Your App
  ├─ Expo Metro: localhost:19000
  ├─ Expo Dev Client: localhost:19001
  └─ Your App: Emulator/Device/QR scan

Python API
  └─ Flask: localhost:5000
```

No port conflicts—they use different ports!

---

## ⚙️ Configuration Options

### Environment Variables (.env)

```env
# Required
API_PORT=5000

# Optional
API_HOST=localhost
NODE_ENV=development
PYTHONUNBUFFERED=1
REACT_APP_API_URL=http://localhost:5000
```

### Changing API Port

```bash
# Use custom port
API_PORT=8000 npm start
```

Then in your app:

```typescript
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
```

---

## 🐛 Debugging Tips

### Check Python Path

```bash
which python          # Unix
where python          # Windows

# Inside venv
.venv/Scripts/python --version  # Windows
.venv/bin/python --version      # Unix
```

### Check Port Usage

```bash
# Windows
netstat -ano | findstr :5000

# Mac/Linux
lsof -i :5000
```

### View Process Output

```bash
# While npm start is running, open another terminal:
npm run start-api     # See API output only
npm run start-expo    # See Expo output only
```

### Test API Directly

```bash
# Health check
curl http://localhost:5000/health

# Classes
curl http://localhost:5000/classes

# Prediction (needs base64 image)
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"image":"..."}'
```

---

## 📊 Startup Timing

```
npm start (t=0)
├─ concurrently parses scripts (t=50ms)
├─ Spawn start-api (t=100ms)
│  ├─ Node starts (t=150ms)
│  ├─ Detect Python (t=200ms)
│  └─ Python server ready (t=2-3s) ← API available
│
└─ Spawn start-expo (t=100ms)
   ├─ Expo starts (t=200ms)
   └─ Metro bundler ready (t=5-8s) ← App ready

Both available: ~8 seconds total
```

---

## 🎯 Setup Checklist (Quick)

- [ ] Run `npm install` in `AppDev-PathoNet/`
- [ ] Create `.venv` in parent directory: `python -m venv .venv`
- [ ] Activate: `.venv\Scripts\activate` (Windows) or `source .venv/bin/activate` (Unix)
- [ ] Install Python deps: `pip install -r requirements.txt`
- [ ] Run: `npm start`
- [ ] Scan QR code with Expo Go
- [ ] Test API call from app

---

## 🔄 Switching Between Methods

If you want to use a different setup method:

### From Concurrently → Direct Python

```bash
# Edit package.json:
"start-api": "cd .. && python run_api_server.py"
```

### From Concurrently → Node Script Only

```bash
# Edit package.json:
"start": "node scripts/start-all.js"
# Remove concurrently dependency (optional)
```

### From Concurrently → Separate Terminals

```bash
# Terminal 1:
npm run start-api

# Terminal 2:
npm run start-expo
```

See [SETUP_METHODS.md](./SETUP_METHODS.md) for detailed comparison.

---

## 🆘 Emergency Fixes

### Everything is broken

```bash
npm run kill-processes
npm cache clean --force
rm -rf node_modules
npm install
npm start
```

### Python issues

```bash
.venv/Scripts/activate  # Windows
source .venv/bin/activate  # Unix
pip install -r requirements.txt
npm start
```

### Port conflicts

```bash
npm run kill-processes
API_PORT=5001 npm start
```

### Expo hangs

```bash
npm run reset-project
npm cache clean --force
npm start
```

---

## 📚 Documentation Map

```
EXPO_PYTHON_API_SETUP.md (YOU ARE HERE)
├── For beginners
│   └─ QUICK_START.md
│       └─ 5 minutes to running
│
├── For developers
│   ├─ API_EXPO_SETUP.md
│   │   └─ Full technical details
│   └─ USING_THE_API.md
│       └─ Integration examples
│
├── For decision makers
│   ├─ SETUP_METHODS.md
│   │   └─ 4 different approaches
│   └─ SETUP_COMPLETE.md
│       └─ Feature summary
│
└── For verification
    └─ SETUP_CHECKLIST.md
        └─ Verify everything works
```

---

## ✅ Verification

Run this to verify everything:

```bash
# API is running
curl http://localhost:5000/health
# Should return: { "status": "ok" }

# Expo is running
# Should see QR code in terminal

# Both processes exist
# Windows: tasklist | find "node\|python"
# Unix: ps aux | grep -E "node|python"
```

---

## 🎓 Learning Resources

- [Expo Documentation](https://docs.expo.dev)
- [Node.js Child Process](https://nodejs.org/api/child_process.html)
- [Flask Documentation](https://flask.palletsprojects.com)
- [Concurrently Package](https://www.npmjs.com/package/concurrently)
- [React Native Networking](https://reactnative.dev/docs/network)

---

## 🎉 You're Ready!

```bash
npm start
```

This single command now:
✅ Starts Python API on port 5000
✅ Starts Expo dev server
✅ Shows both outputs together
✅ Handles shutdown cleanly

**Happy coding! 🚀🌱**

---

## 📞 Quick Reference Card

```
START:           npm start
STOP:            Ctrl+C or npm run stop
API ONLY:        npm run start-api
EXPO ONLY:       npm run start-expo
KILL PROCESSES:  npm run kill-processes
TEST API:        curl http://localhost:5000/health
CHECK PORTS:     netstat -ano | findstr :5000 (Windows)
LOGS:            Check terminal output
```

---

**Setup Status: ✅ COMPLETE**

Your Expo app is now integrated with your Python API!

See you in development. 🚀
