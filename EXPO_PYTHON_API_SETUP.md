# 🚀 Expo + Python API: Complete Integration Setup

Your Expo app and Python API are now configured to run simultaneously with a single command!

## 📌 Quick Navigation

### For New Users (Start Here)

- **[⚡ QUICK_START.md](./AppDev-PathoNet/QUICK_START.md)** — 5-minute setup guide
- **[✅ SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** — Verify everything works

### For Developers

- **[📡 USING_THE_API.md](./USING_THE_API.md)** — How to call API from your app
- **[🔧 API_EXPO_SETUP.md](./AppDev-PathoNet/API_EXPO_SETUP.md)** — Full technical details
- **[📋 SETUP_METHODS.md](./SETUP_METHODS.md)** — 4 different ways to set this up

### Reference

- **[📊 SETUP_COMPLETE.md](./AppDev-PathoNet/SETUP_COMPLETE.md)** — Feature summary & quick ref

---

## 🎯 What Was Set Up

### Before

```
Expo App ❌ Python API
(Separate processes, manual management)
```

### After

```
npm start
    ↓
┌─────────────────────────────┐
│ concurrently spawns         │
├───────────────┬─────────────┤
│ Python API    │ Expo Server │
│ :5000         │ :19000      │
└───────────────┴─────────────┘
(Single command, synchronized)
```

---

## 🚀 One-Command Start

```bash
cd AppDev-PathoNet
npm start
```

That's it! Both services start automatically. ✨

---

## 📁 What Was Created

### New Files:

| File                        | Purpose                        | Platform |
| --------------------------- | ------------------------------ | -------- |
| `scripts/run-api.js`        | Cross-platform Python launcher | All      |
| `scripts/kill-processes.js` | Clean process shutdown         | All      |
| `scripts/start-all.js`      | Alternative Node.js starter    | All      |
| `.env.example`              | Configuration template         | All      |
| `QUICK_START.md`            | Beginner guide                 | All      |
| `API_EXPO_SETUP.md`         | Full setup documentation       | All      |
| `SETUP_COMPLETE.md`         | Feature summary                | All      |
| `SETUP_METHODS.md`          | 4 setup approaches             | All      |
| `USING_THE_API.md`          | API integration guide          | All      |
| `SETUP_CHECKLIST.md`        | Verification checklist         | All      |

### Modified Files:

| File                           | Changes                                    |
| ------------------------------ | ------------------------------------------ |
| `AppDev-PathoNet/package.json` | Updated npm scripts for concurrent startup |

---

## 🎮 Available Commands

```bash
# Main commands
npm start              # Start API + Expo together (recommended)
npm run start-api      # Start only Python API
npm run start-expo     # Start only Expo
npm run kill-processes # Stop all services

# Aliases
npm run start:dev      # Same as npm start
npm run stop           # Same as npm run kill-processes
```

---

## 🔌 Running Services

When you run `npm start`:

### ✅ Python API

- Address: `http://localhost:5000`
- Health: `GET /health`
- Predict: `POST /predict`
- Classes: `GET /classes`

### ✅ Expo Dev Server

- Shows QR code for scanning
- Works with Expo Go app
- Supports Android Emulator, iOS Simulator
- Metro bundler running

---

## 💻 Use It From Your App

### Simple Example:

```typescript
const response = await fetch("http://localhost:5000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image: base64Image }),
});

const result = await response.json();
```

See [USING_THE_API.md](./USING_THE_API.md) for complete examples.

---

## 🔍 Project Structure

```
ApplicationDevelopment/
├── .venv/                          # Python environment
├── run_api_server.py               # API entry point
│
├── AppDev-PathoNet/                # Expo app
│   ├── package.json                # npm config (UPDATED)
│   │
│   ├── scripts/
│   │   ├── run-api.js              # ← Cross-platform launcher
│   │   ├── kill-processes.js       # ← Process cleanup
│   │   └── start-all.js            # ← Alternative runner
│   │
│   ├── app/
│   │   └── (tabs)/
│   │       ├── Scan.tsx
│   │       ├── Home.tsx
│   │       └── Analytics.tsx
│   │
│   ├── .env.example                # ← Config template
│   ├── QUICK_START.md              # ← Read this first!
│   ├── API_EXPO_SETUP.md           # ← Full details
│   ├── SETUP_COMPLETE.md           # ← Quick reference
│   └── requirements.txt
│
├── SETUP_METHODS.md                # ← 4 setup approaches
├── USING_THE_API.md                # ← API integration guide
├── SETUP_CHECKLIST.md              # ← Verification checklist
└── README.md
```

---

## 📊 Quick Decision Tree

```
Do you need to start the app?
│
├─ YES, as a beginner?
│  └─→ Read: QUICK_START.md
│      Run: npm start
│
├─ YES, but need integration examples?
│  └─→ Read: USING_THE_API.md
│      Then: Build your components
│
├─ YES, and want to understand all options?
│  └─→ Read: SETUP_METHODS.md
│      Choose: Your preferred method
│
├─ Need to fix something?
│  └─→ Read: API_EXPO_SETUP.md (troubleshooting section)
│      Or: Run: npm run kill-processes
│      Then: npm start
│
└─ Want to verify everything?
   └─→ Follow: SETUP_CHECKLIST.md
       Check: All boxes ✅
```

---

## ⚙️ How It Works

### Startup Flow:

1. You run: `npm start`
2. Node reads `package.json` scripts
3. `concurrently` package spawns 2 processes:
   - `npm run start-api` → `node scripts/run-api.js` → Finds Python → Runs API
   - `npm run start-expo` → `expo start` → Starts Metro bundler
4. Both outputs show in same terminal
5. Press `Ctrl+C` to stop both

### Python Detection (`scripts/run-api.js`):

1. Checks: `.venv/Scripts/python.exe` (Windows)
2. Checks: `.venv/bin/python` (Mac/Linux)
3. Falls back to: system `python` or `python3`
4. Runs: `run_api_server.py` from parent directory

### Error Handling:

- If Python not found → Shows helpful error with activation instructions
- If port in use → Run `npm run kill-processes`
- If script not found → Shows file location and current working directory

---

## 🔧 Configuration

### Environment Variables (`.env`)

```env
API_PORT=5000
API_HOST=localhost
REACT_APP_API_URL=http://localhost:5000
NODE_ENV=development
```

### API Endpoints

```
Health:  GET  http://localhost:5000/health
Classes: GET  http://localhost:5000/classes
Predict: POST http://localhost:5000/predict
```

---

## 🚨 Common Issues & Solutions

| Issue                   | Solution                                        |
| ----------------------- | ----------------------------------------------- |
| "Python not found"      | Activate venv: `.venv\Scripts\activate`         |
| "Port 5000 in use"      | Run: `npm run kill-processes`                   |
| "Module not found"      | Install: `pip install -r requirements.txt`      |
| "expo start fails"      | Run: `npm cache clean --force` then `npm start` |
| Only one service starts | Check logs, restart with `npm start`            |

Full troubleshooting in [API_EXPO_SETUP.md](./AppDev-PathoNet/API_EXPO_SETUP.md).

---

## 📱 Platform-Specific URLs

| Platform         | URL                              |
| ---------------- | -------------------------------- |
| Web Browser      | `http://localhost:5000`          |
| iOS Simulator    | `http://localhost:5000`          |
| Android Emulator | `http://10.0.2.2:5000`           |
| Physical Device  | `http://<YOUR_COMPUTER_IP>:5000` |

---

## 🎯 Next Steps

### Step 1: Initial Setup ⚙️

```bash
cd AppDev-PathoNet
npm install
# (from parent) .venv/Scripts/activate
# (from parent) pip install -r requirements.txt
```

### Step 2: Start Everything 🚀

```bash
npm start
```

### Step 3: Verify Connection 🔍

- Scan QR code with Expo Go
- Or select emulator/simulator
- App should load

### Step 4: Integrate API 🔌

Follow examples in [USING_THE_API.md](./USING_THE_API.md)

### Step 5: Build Your App 🌱

- Add API calls to your components
- Test predictions
- Deploy!

---

## 📚 Documentation Roadmap

```
Start Here
    ↓
QUICK_START.md (beginner overview)
    ↓
├─→ Want integration examples?
│   └→ USING_THE_API.md
│
├─→ Want technical details?
│   └→ API_EXPO_SETUP.md
│
├─→ Want to understand all options?
│   └→ SETUP_METHODS.md
│
└─→ Want to verify setup?
    └→ SETUP_CHECKLIST.md
```

---

## ✨ Features

✅ **Cross-Platform** — Windows, Mac, Linux  
✅ **Auto-Detection** — Finds Python automatically  
✅ **Error Handling** — Helpful error messages  
✅ **Easy Shutdown** — Clean `Ctrl+C` handling  
✅ **Synchronized** — Both services in one terminal  
✅ **Configurable** — Environment variables support  
✅ **Beginner-Friendly** — Simple one-command startup  
✅ **Production-Ready** — Proper process management

---

## 🆘 Need Help?

1. **First time?** → Read [QUICK_START.md](./AppDev-PathoNet/QUICK_START.md)
2. **Something broken?** → See [API_EXPO_SETUP.md](./AppDev-PathoNet/API_EXPO_SETUP.md) troubleshooting
3. **Need API examples?** → See [USING_THE_API.md](./USING_THE_API.md)
4. **Choose setup method?** → See [SETUP_METHODS.md](./SETUP_METHODS.md)
5. **Verify everything?** → Use [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

---

## 🎉 You're All Set!

Run this and you're ready to develop:

```bash
npm start
```

Happy coding! 🚀🌱

---

**Last Updated:** April 2026  
**Setup Type:** Expo + Python API with Concurrently  
**Status:** ✅ Complete and Ready to Use
